// src/services/payment/payment-service.js
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { tokenService } from '@/lib/security/token-service';
import { offerService } from '../offer/offer-service';

/**
 * Serwis płatności - zarządza procesem płatności i dostępu do subskrypcji
 */
export class PaymentService {
  /**
   * Inicjalizuje serwis płatności
   * @param {Object} deps - Zależności serwisu
   */
  constructor(deps = {}) {
    this.offerService = deps.offerService || offerService;
    this.tokenService = deps.tokenService || tokenService;
    
    // Konfiguracja prowizji platformy
    this.platformFeePercent = 0.05; // 5%
  }
  
  /**
   * Przetwarza płatność dla zakupu subskrypcji
   * @param {string} purchaseId - ID zakupu
   * @param {string} paymentMethod - Metoda płatności
   * @param {string} userId - ID użytkownika
   * @returns {Promise<Object>} - Dane dostępu
   */
  async processPayment(purchaseId, paymentMethod, userId) {
    try {
      // 1. Pobierz dane zakupu
      const purchase = await this.getPurchaseRecord(purchaseId);
      
      // 2. Sprawdź, czy zakup należy do użytkownika
      if (purchase.user_id !== userId) {
        throw new Error('Brak uprawnień do przetworzenia tej płatności');
      }
      
      // 3. Sprawdź, czy zakup jest w stanie oczekiwania na płatność
      if (purchase.status !== 'pending_payment') {
        throw new Error('Zakup nie jest w stanie oczekiwania na płatność');
      }
      
      // 4. Sprawdź, czy oferta jest nadal aktywna i ma dostępne miejsca
      const offer = purchase.group_sub;
      if (offer.status !== 'active' || offer.slots_available <= 0) {
        throw new Error('Oferta nie jest już dostępna');
      }
      
      // 5. Utwórz transakcję
      const transactionId = await this.createTransaction(
        userId,
        offer.groups.owner_id,
        offer.id,
        purchaseId,
        offer.price_per_slot,
        paymentMethod
      );
      
      // 6. Przetwórz płatność (symulacja)
      await this.simulatePaymentProcessing(transactionId);
      
      // 7. Zaktualizuj status zakupu
      await this.updatePurchaseStatus(purchaseId, 'completed');
      
      // 8. Zmniejsz liczbę dostępnych miejsc w ofercie
      await this.decrementAvailableSlots(offer.id);
      
      // 9. Wygeneruj token dostępu
      const { token, accessUrl } = await this.generateAccessToken(purchaseId, userId);
      
      // 10. Zaloguj operację
      await this.logPaymentActivity('payment_processed', purchaseId, userId, {
        transaction_id: transactionId,
        payment_method: paymentMethod
      });
      
      return {
        success: true,
        purchaseId,
        transactionId,
        accessUrl
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      
      // Zaloguj błąd płatności
      if (userId && purchaseId) {
        await this.logPaymentActivity('payment_failed', purchaseId, userId, {
          error: error.message
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Potwierdza poprawność dostępu do subskrypcji
   * @param {string} purchaseId - ID zakupu
   * @param {boolean} isWorking - Czy dostęp działa poprawnie
   * @param {string} userId - ID użytkownika
   * @returns {Promise<Object>} - Wynik potwierdzenia
   */
  async confirmAccess(purchaseId, isWorking, userId) {
    try {
      // 1. Pobierz dane zakupu
      const purchase = await this.getPurchaseRecord(purchaseId);
      
      // 2. Sprawdź, czy zakup należy do użytkownika
      if (purchase.user_id !== userId) {
        throw new Error('Brak uprawnień do potwierdzenia tego dostępu');
      }
      
      // 3. Sprawdź, czy dostęp został udostępniony
      if (!purchase.access_provided) {
        throw new Error('Dostęp nie został jeszcze udostępniony');
      }
      
      // 4. Zaktualizuj status potwierdzenia
      await supabaseAdmin
        .from('purchase_records')
        .update({
          access_confirmed: true,
          access_confirmed_at: new Date().toISOString()
        })
        .eq('id', purchaseId);
      
      // 5. Jeśli dostęp nie działa, utwórz spór
      if (!isWorking) {
        const disputeId = await this.createAccessDispute(purchaseId, userId);
        
        return {
          confirmed: true,
          disputeCreated: true,
          disputeId
        };
      }
      
      // 6. Zaloguj operację
      await this.logPaymentActivity('access_confirmation', purchaseId, userId, {
        isWorking
      });
      
      return {
        confirmed: true,
        disputeCreated: false
      };
    } catch (error) {
      console.error('Error confirming access:', error);
      throw error;
    }
  }
  
  /**
   * Generuje raport sprzedaży dla sprzedawcy
   * @param {string} userId - ID użytkownika (sprzedawcy)
   * @param {Object} filters - Filtry raportu
   * @returns {Promise<Object>} - Raport sprzedaży
   */
  async generateSalesReport(userId, filters = {}) {
    try {
      // Zakres dat
      const startDate = filters.startDate ? new Date(filters.startDate) : new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Domyślnie ostatni miesiąc
      
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
      
      // Pobierz transakcje sprzedaży dla sprzedawcy
      const { data: transactions, error } = await supabaseAdmin
        .from('transactions')
        .select(`
          *,
          group_sub:group_subs(
            id,
            price_per_slot,
            currency,
            subscription_platforms(id, name)
          ),
          buyer:user_profiles!buyer_id(id, display_name, email)
        `)
        .eq('seller_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());
      
      if (error) {
        throw new Error('Nie udało się pobrać transakcji: ' + error.message);
      }
      
      // Przygotuj podsumowanie sprzedaży
      const summary = {
        totalSales: transactions.length,
        totalRevenue: 0,
        platformFees: 0,
        netRevenue: 0,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        byPlatform: {},
        transactions: transactions.map(tx => ({
          id: tx.id,
          date: tx.completed_at,
          platform: tx.group_sub.subscription_platforms.name,
          amount: tx.amount,
          fee: tx.platform_fee,
          net: tx.seller_amount,
          buyer: tx.buyer.display_name
        }))
      };
      
      // Oblicz sumy i statystyki
      for (const tx of transactions) {
        summary.totalRevenue += tx.amount;
        summary.platformFees += tx.platform_fee;
        summary.netRevenue += tx.seller_amount;
        
        // Statystyki według platformy
        const platformName = tx.group_sub.subscription_platforms.name;
        if (!summary.byPlatform[platformName]) {
          summary.byPlatform[platformName] = {
            count: 0,
            totalRevenue: 0,
            netRevenue: 0
          };
        }
        
        summary.byPlatform[platformName].count++;
        summary.byPlatform[platformName].totalRevenue += tx.amount;
        summary.byPlatform[platformName].netRevenue += tx.seller_amount;
      }
      
      return summary;
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw error;
    }
  }
  
  // Metody pomocnicze
  
  /**
   * Pobiera rekord zakupu ze szczegółami
   * @param {string} purchaseId - ID zakupu
   * @returns {Promise<Object>} - Dane zakupu
   */
  async getPurchaseRecord(purchaseId) {
    const { data: purchase, error } = await supabaseAdmin
      .from('purchase_records')
      .select(`
        *,
        group_sub:group_subs(
          *,
          subscription_platforms(*),
          groups(id, name, owner_id)
        )
      `)
      .eq('id', purchaseId)
      .single();
    
    if (error) {
      throw new Error('Nie udało się pobrać danych zakupu: ' + error.message);
    }
    
    if (!purchase) {
      throw new Error('Zakup nie istnieje');
    }
    
    return purchase;
  }
  
  /**
   * Tworzy rekord transakcji
   * @param {string} buyerId - ID kupującego
   * @param {string} sellerId - ID sprzedającego
   * @param {string} groupSubId - ID oferty
   * @param {string} purchaseRecordId - ID zakupu
   * @param {number} amount - Kwota transakcji
   * @param {string} paymentMethod - Metoda płatności
   * @returns {Promise<string>} - ID transakcji
   */
  async createTransaction(buyerId, sellerId, groupSubId, purchaseRecordId, amount, paymentMethod) {
    // Oblicz prowizję platformy
    const platformFee = amount * this.platformFeePercent;
    const sellerAmount = amount - platformFee;
    
    // Generuj ID płatności (w rzeczywistości otrzymane od dostawcy płatności)
    const paymentId = 'pmt_' + Math.random().toString(36).substr(2, 9);
    
    // Utwórz transakcję
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        group_sub_id: groupSubId,
        purchase_record_id: purchaseRecordId,
        amount: amount,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        currency: 'PLN', // Domyślna waluta
        payment_method: paymentMethod,
        payment_provider: 'stripe', // Domyślny dostawca
        payment_id: paymentId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      throw new Error('Nie udało się utworzyć transakcji: ' + error.message);
    }
    
    return data.id;
  }
  
  /**
   * Symuluje przetwarzanie płatności (w rzeczywistości integracja z dostawcą płatności)
   * @param {string} transactionId - ID transakcji
   * @returns {Promise<boolean>} - Czy płatność się powiodła
   */
  async simulatePaymentProcessing(transactionId) {
    // W rzeczywistej implementacji: wywołanie dostawcy płatności
    // Symulacja udanej płatności
    
    // Aktualizuj status transakcji
    const { error } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);
    
    if (error) {
      throw new Error('Nie udało się zaktualizować statusu transakcji: ' + error.message);
    }
    
    return true;
  }
  
  /**
   * Aktualizuje status zakupu
   * @param {string} purchaseId - ID zakupu
   * @param {string} status - Nowy status
   * @returns {Promise<Object>} - Zaktualizowany zakup
   */
  async updatePurchaseStatus(purchaseId, status) {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // Dodatkowe pola dla statusu "completed"
    if (status === 'completed') {
      updates.access_provided = true;
      updates.access_provided_at = new Date().toISOString();
    }
    
    const { data, error } = await supabaseAdmin
      .from('purchase_records')
      .update(updates)
      .eq('id', purchaseId)
      .select()
      .single();
    
    if (error) {
      throw new Error('Nie udało się zaktualizować statusu zakupu: ' + error.message);
    }
    
    return data;
  }
  
  /**
   * Zmniejsza liczbę dostępnych miejsc w ofercie
   * @param {string} offerId - ID oferty
   * @returns {Promise<boolean>} - Czy operacja się powiodła
   */
  async decrementAvailableSlots(offerId) {
    // Pobierz aktualną liczbę dostępnych miejsc
    const { data: offer } = await supabaseAdmin
      .from('group_subs')
      .select('slots_available')
      .eq('id', offerId)
      .single();
    
    if (offer.slots_available <= 0) {
      throw new Error('Brak dostępnych miejsc w ofercie');
    }
    
    // Zmniejsz liczbę dostępnych miejsc
    const { error } = await supabaseAdmin
      .from('group_subs')
      .update({
        slots_available: offer.slots_available - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', offerId);
    
    if (error) {
      throw new Error('Nie udało się zaktualizować liczby dostępnych miejsc: ' + error.message);
    }
    
    return true;
  }
  
  /**
   * Generuje token dostępu dla zakupu
   * @param {string} purchaseId - ID zakupu
   * @param {string} userId - ID użytkownika
   * @returns {Promise<Object>} - Token i URL dostępu
   */
  async generateAccessToken(purchaseId, userId) {
    const { token, tokenId, accessUrl } = await this.tokenService.generateAccessToken(
      purchaseId,
      userId,
      30 // 30 minut ważności
    );
    
    return { token, tokenId, accessUrl };
  }
  
  /**
   * Tworzy spór dotyczący problemów z dostępem
   * @param {string} purchaseId - ID zakupu
   * @param {string} userId - ID użytkownika
   * @returns {Promise<string>} - ID utworzonego sporu
   */
  async createAccessDispute(purchaseId, userId) {
    // Znajdź transakcję powiązaną z zakupem
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('id, group_sub_id, seller_id')
      .eq('purchase_record_id', purchaseId)
      .single();
    
    if (!transaction) {
      throw new Error('Nie znaleziono transakcji dla tego zakupu');
    }
    
    // Utwórz spór
    const { data: dispute, error } = await supabaseAdmin
      .from('disputes')
      .insert({
        reporter_id: userId,
        reported_entity_type: 'subscription',
        reported_entity_id: transaction.group_sub_id,
        transaction_id: transaction.id,
        dispute_type: 'access',
        description: 'Automatyczne zgłoszenie: problem z dostępem do subskrypcji',
        status: 'open',
        evidence_required: true,
        resolution_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dni
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      throw new Error('Nie udało się utworzyć sporu: ' + error.message);
    }
    
    // Powiadomienia
    await this.createNotifications(dispute.id, userId, transaction.seller_id);
    
    return dispute.id;
  }
  
  /**
   * Tworzy powiadomienia o sporze
   * @param {string} disputeId - ID sporu
   * @param {string} buyerId - ID kupującego
   * @param {string} sellerId - ID sprzedającego
   */
  async createNotifications(disputeId, buyerId, sellerId) {
    // Powiadomienie dla kupującego
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: buyerId,
        type: 'dispute_created',
        title: 'Zgłoszenie problemu z dostępem',
        content: 'Twoje zgłoszenie zostało zarejestrowane. Skontaktujemy się z Tobą wkrótce.',
        related_entity_type: 'dispute',
        related_entity_id: disputeId,
        created_at: new Date().toISOString(),
        is_read: false
      });
    
    // Powiadomienie dla sprzedającego
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: sellerId,
        type: 'dispute_filed',
        title: 'Zgłoszono problem z dostępem',
        content: 'Kupujący zgłosił problem z dostępem do Twojej subskrypcji. Prosimy o pilną weryfikację.',
        related_entity_type: 'dispute',
        related_entity_id: disputeId,
        created_at: new Date().toISOString(),
        is_read: false
      });
  }
  
  /**
   * Loguje aktywność związaną z płatnością
   * @param {string} action - Typ akcji
   * @param {string} purchaseId - ID zakupu
   * @param {string} userId - ID użytkownika
   * @param {Object} details - Dodatkowe szczegóły
   */
  async logPaymentActivity(action, purchaseId, userId, details = {}) {
    try {
      await supabaseAdmin
        .from('security_logs')
        .insert({
          user_id: userId,
          action_type: action,
          resource_type: 'purchase_record',
          resource_id: String(purchaseId),
          status: action.includes('_failed') ? 'failure' : 'success',
          details: details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging payment activity:', error);
      // Nie rzucamy błędu, aby nie przerywać głównej operacji
    }
  }
}

// Eksport instancji domyślnej do użycia w aplikacji
export const paymentService = new PaymentService();