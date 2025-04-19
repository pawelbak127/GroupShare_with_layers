// /src/infrastructure/external-services/payment/PaymentServiceAdapter.js

import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { ApplicationException } from '@/application/exceptions';
import { Id } from '@/domain/shared/value-objects/Id';

/**
 * Adapter usługi płatności implementujący zewnętrznego dostawcę płatności
 * Odpowiada za integrację z różnymi bramkami płatności (BLIK, karty, przelewy)
 */
export class PaymentServiceAdapter {
  /**
   * Inicjalizuje adapter usługi płatności
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(options = {}) {
    this.options = {
      blikEnabled: true,
      cardEnabled: true,
      transferEnabled: true,
      platformFeePercent: 0.05, // 5% opłaty platformy
      testMode: process.env.NODE_ENV !== 'production',
      logTransactions: true,
      ...options
    };
    
    // Konfiguracja dostawców płatności
    this.providerConfigs = {
      blik: {
        apiKey: process.env.BLIK_API_KEY || 'test_blik_key',
        apiUrl: process.env.BLIK_API_URL || 'https://api.test.blik.com',
        merchantId: process.env.BLIK_MERCHANT_ID || 'test_merchant'
      },
      card: {
        apiKey: process.env.CARD_API_KEY || 'test_card_key',
        apiUrl: process.env.CARD_API_URL || 'https://api.test.card.com',
        merchantId: process.env.CARD_MERCHANT_ID || 'test_merchant'
      },
      transfer: {
        apiKey: process.env.TRANSFER_API_KEY || 'test_transfer_key',
        apiUrl: process.env.TRANSFER_API_URL || 'https://api.test.transfer.com',
        accountNumber: process.env.TRANSFER_ACCOUNT || 'PL123456789'
      }
    };
  }
  
  /**
   * Przetwarza płatność za subskrypcję
   * @param {string} purchaseId - ID zakupu
   * @param {string} paymentMethod - Metoda płatności
   * @param {string} userId - ID użytkownika
   * @returns {Promise<Object>} - Wynik przetwarzania
   */
  async processPayment(purchaseId, paymentMethod, userId) {
    try {
      // Sprawdź czy parametry są prawidłowe
      if (!purchaseId || !userId) {
        throw new Error('Purchase ID and User ID are required');
      }
      
      // Sprawdź czy metoda płatności jest obsługiwana
      if (!this.isPaymentMethodEnabled(paymentMethod)) {
        throw new Error(`Payment method ${paymentMethod} is not enabled`);
      }
      
      // Pobierz dane zakupu
      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from('purchase_records')
        .select(`
          *,
          group_sub:group_subs(
            id, 
            price_per_slot, 
            currency, 
            slots_available,
            group_id,
            groups(owner_id)
          )
        `)
        .eq('id', purchaseId)
        .single();
      
      if (purchaseError || !purchase) {
        throw new Error('Purchase record not found');
      }
      
      // Sprawdź dostępność miejsc
      if (purchase.group_sub.slots_available < 1) {
        throw new Error('Brak dostępnych miejsc w subskrypcji');
      }
      
      // Sprawdź czy to właściwy użytkownik
      if (purchase.user_id !== userId) {
        throw new Error('User does not own this purchase record');
      }
      
      // Oblicz opłaty
      const amount = purchase.group_sub.price_per_slot;
      const currency = purchase.group_sub.currency;
      const platformFee = amount * this.options.platformFeePercent;
      const sellerAmount = amount - platformFee;
      
      // Pobierz ID sprzedającego
      const sellerId = purchase.group_sub.groups.owner_id;
      
      // Utwórz transakcję
      const transactionId = Id.create().toString();
      const transactionData = {
        id: transactionId,
        buyer_id: userId,
        seller_id: sellerId,
        group_sub_id: purchase.group_sub_id,
        purchase_record_id: purchaseId,
        amount: amount,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        currency: currency,
        payment_method: paymentMethod,
        payment_provider: this.getProviderForMethod(paymentMethod),
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      // Zapisz transakcję w bazie danych
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert([transactionData]);
      
      if (transactionError) {
        throw new Error(`Failed to create transaction: ${transactionError.message}`);
      }
      
      // Symulacja procesu płatności
      const paymentResult = await this.simulatePaymentProvider(
        paymentMethod,
        amount,
        currency,
        purchaseId,
        transactionId
      );
      
      // W przypadku powodzenia, zaktualizuj transakcję i zakup
      if (paymentResult.success) {
        // Aktualizuj transakcję
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'completed',
            payment_id: paymentResult.paymentId,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId);
        
        // Aktualizuj zakup
        await supabaseAdmin
          .from('purchase_records')
          .update({
            status: 'completed',
            access_provided: true,
            access_provided_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', purchaseId);
        
        // Zmniejsz liczbę dostępnych miejsc
        await supabaseAdmin
          .from('group_subs')
          .update({
            slots_available: purchase.group_sub.slots_available - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', purchase.group_sub_id);
        
        // Zaloguj transakcję
        if (this.options.logTransactions) {
          await this.logTransaction({
            transaction_id: transactionId,
            purchase_id: purchaseId,
            user_id: userId,
            amount,
            currency,
            payment_method: paymentMethod,
            status: 'success',
            payment_id: paymentResult.paymentId,
            timestamp: new Date().toISOString()
          });
        }
        
        // Przygotuj URL dostępu
        const accessUrl = `/access/${purchaseId}?token=${paymentResult.accessToken}`;
        
        return {
          success: true,
          transactionId,
          purchaseId,
          accessUrl,
          method: paymentMethod
        };
      } else {
        // W przypadku niepowodzenia, oznacz jako nieudane
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'failed',
            error_message: paymentResult.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId);
        
        // Zaloguj nieudaną transakcję
        if (this.options.logTransactions) {
          await this.logTransaction({
            transaction_id: transactionId,
            purchase_id: purchaseId,
            user_id: userId,
            amount,
            currency,
            payment_method: paymentMethod,
            status: 'failed',
            error: paymentResult.error,
            timestamp: new Date().toISOString()
          });
        }
        
        throw new Error(`Payment failed: ${paymentResult.error}`);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Logowanie błędu
      if (this.options.logTransactions) {
        await this.logTransaction({
          purchase_id: purchaseId,
          user_id: userId,
          payment_method: paymentMethod,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      throw new ApplicationException(error.message, 'PAYMENT_ERROR');
    }
  }
  
  /**
   * Symuluje bramkę płatności (w środowisku produkcyjnym byłaby prawdziwa integracja)
   * @param {string} method - Metoda płatności
   * @param {number} amount - Kwota płatności
   * @param {string} currency - Waluta
   * @param {string} purchaseId - ID zakupu
   * @param {string} transactionId - ID transakcji
   * @returns {Promise<Object>} - Wynik płatności
   * @private
   */
  async simulatePaymentProvider(method, amount, currency, purchaseId, transactionId) {
    // W środowisku produkcyjnym, tutaj byłaby prawdziwa integracja z bramką płatności
    // Dla celów demonstracyjnych, symulujemy udaną płatność
    
    // Czekaj losową ilość czasu, aby zasymulować opóźnienie API
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Symuluj udaną płatność w trybie testowym
    if (this.options.testMode) {
      // Generuj unikalny identyfikator płatności
      const paymentId = `${method}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Generuj token dostępu
      const accessToken = `access_${Math.random().toString(36).substring(2, 15)}`;
      
      return {
        success: true,
        paymentId,
        accessToken,
        transactionId,
        method,
        testMode: true
      };
    }
    
    // W środowisku produkcyjnym, kod integracji byłby tutaj
    // W zależności od metody płatności, wywołalibyśmy odpowiednie API
    
    // Przykład dla BLIK:
    if (method === 'blik') {
      try {
        // Tutaj byłby kod integracji z API BLIK
        // const response = await axios.post(`${this.providerConfigs.blik.apiUrl}/transactions`, {
        //   merchantId: this.providerConfigs.blik.merchantId,
        //   amount,
        //   currency,
        //   externalId: transactionId,
        //   description: `Zakup subskrypcji #${purchaseId}`
        // }, {
        //   headers: {
        //     'Authorization': `Bearer ${this.providerConfigs.blik.apiKey}`
        //   }
        // });
        
        // if (response.data && response.data.status === 'success') {
        //   return {
        //     success: true,
        //     paymentId: response.data.paymentId,
        //     accessToken: this.generateAccessToken(),
        //     transactionId
        //   };
        // }
        
        // Symulacja udanej płatności
        return {
          success: true,
          paymentId: `blik_${Date.now()}`,
          accessToken: `access_${Math.random().toString(36).substring(2, 15)}`,
          transactionId
        };
      } catch (error) {
        return {
          success: false,
          error: error.message || 'BLIK payment failed'
        };
      }
    }
    
    // Symulacja domyślna dla innych metod
    return {
      success: true,
      paymentId: `${method}_${Date.now()}`,
      accessToken: `access_${Math.random().toString(36).substring(2, 15)}`,
      transactionId
    };
  }
  
  /**
   * Sprawdza czy dana metoda płatności jest włączona
   * @param {string} method - Metoda płatności
   * @returns {boolean} - Czy metoda jest włączona
   * @private
   */
  isPaymentMethodEnabled(method) {
    switch (method.toLowerCase()) {
      case 'blik':
        return this.options.blikEnabled;
      case 'card':
        return this.options.cardEnabled;
      case 'transfer':
        return this.options.transferEnabled;
      default:
        return false;
    }
  }
  
  /**
   * Zwraca nazwę dostawcy dla danej metody płatności
   * @param {string} method - Metoda płatności
   * @returns {string} - Nazwa dostawcy
   * @private
   */
  getProviderForMethod(method) {
    switch (method.toLowerCase()) {
      case 'blik':
        return 'blik_provider';
      case 'card':
        return 'card_provider';
      case 'transfer':
        return 'transfer_provider';
      default:
        return 'unknown_provider';
    }
  }
  
  /**
   * Loguje transakcję do bazy danych
   * @param {Object} logData - Dane do zalogowania
   * @returns {Promise<void>}
   * @private
   */
  async logTransaction(logData) {
    try {
      await supabaseAdmin
        .from('payment_logs')
        .insert([{
          ...logData,
          environment: this.options.testMode ? 'test' : 'production'
        }]);
    } catch (error) {
      console.error('Failed to log transaction:', error);
      // Nie rzucamy wyjątku, aby nie przerywać głównego procesu
    }
  }
  
  /**
   * Sprawdza status płatności
   * @param {string} transactionId - ID transakcji
   * @returns {Promise<Object>} - Status płatności
   */
  async checkPaymentStatus(transactionId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        status: data.status,
        paymentId: data.payment_id,
        completedAt: data.completed_at,
        isCompleted: data.status === 'completed'
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw new ApplicationException('Failed to check payment status', 'PAYMENT_ERROR');
    }
  }
  
  /**
   * Zwraca płatność dla transakcji
   * @param {string} transactionId - ID transakcji
   * @returns {Promise<Object>} - Wynik zwrotu
   */
  async refundPayment(transactionId) {
    try {
      // Pobierz dane transakcji
      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      
      if (transactionError) throw new Error('Transaction not found');
      
      // Sprawdź czy transakcja może być zwrócona
      if (transaction.status !== 'completed') {
        throw new Error('Only completed transactions can be refunded');
      }
      
      // W środowisku produkcyjnym, tutaj byłaby integracja z bramką płatności
      // w celu wykonania zwrotu
      
      // Oznacz transakcję jako zwróconą
      const { error: updateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);
      
      if (updateError) throw updateError;
      
      // Zaloguj zwrot
      if (this.options.logTransactions) {
        await this.logTransaction({
          transaction_id: transactionId,
          purchase_id: transaction.purchase_record_id,
          user_id: transaction.buyer_id,
          amount: transaction.amount,
          currency: transaction.currency,
          payment_method: transaction.payment_method,
          status: 'refunded',
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        transactionId,
        refundedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw new ApplicationException(error.message || 'Failed to refund payment', 'PAYMENT_ERROR');
    }
  }
}

export default PaymentServiceAdapter;