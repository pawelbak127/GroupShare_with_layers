/**
 * Serwis zarządzający transakcjami z wykorzystaniem wzorca Unit of Work
 */
class TransactionService {
    constructor(purchaseRepository, subscriptionRepository, transactionRepository) {
      this.purchaseRepository = purchaseRepository;
      this.subscriptionRepository = subscriptionRepository;
      this.transactionRepository = transactionRepository;
    }
  
    /**
     * Realizuje transakcję zakupu subskrypcji
     * @param {string} userId ID kupującego
     * @param {string} subscriptionId ID subskrypcji
     * @param {string} paymentMethod Metoda płatności
     * @param {string} currency Waluta
     * @returns {Promise<Object>} Dane transakcji
     * @throws {ApplicationException} W przypadku błędu
     */
    async processPurchaseTransaction(userId, subscriptionId, paymentMethod, currency = 'PLN') {
      // Pobierz subskrypcję
      const subscription = await this.subscriptionRepository.findById(subscriptionId);
      if (!subscription) {
        throw new ResourceNotFoundException('Subscription not found', 'subscription', subscriptionId);
      }
      
      // Sprawdź dostępność miejsc
      if (!subscription.isPurchasable()) {
        throw new BusinessRuleViolationException(
          'Subscription cannot be purchased',
          'subscription_not_purchasable'
        );
      }
      
      // Pobierz właściciela grupy
      const group = await this.groupRepository.findById(subscription.groupId);
      const sellerId = group.ownerId;
      
      // Rozpocznij transakcję bazodanową
      const dbTransaction = await this.beginDatabaseTransaction();
      
      try {
        // 1. Utwórz rekord zakupu
        const purchase = Purchase.create(
          Id.create(),
          userId,
          subscriptionId
        );
        
        await this.purchaseRepository.save(purchase);
        
        // 2. Zmniejsz liczbę dostępnych miejsc
        subscription.reserveSlots(1, userId);
        await this.subscriptionRepository.save(subscription);
        
        // 3. Utwórz transakcję płatności
        const transaction = Transaction.create(
          Id.create(),
          userId,
          sellerId,
          subscriptionId,
          purchase.id,
          subscription.pricePerSlot.amount,
          subscription.pricePerSlot.currency,
          paymentMethod
        );
        
        await this.transactionRepository.save(transaction);
        
        // 4. Zapisz transakcję w rekordzie zakupu
        purchase.addTransaction(transaction);
        await this.purchaseRepository.save(purchase);
        
        // 5. Zatwierdź transakcję bazodanową
        await this.commitDatabaseTransaction(dbTransaction);
        
        // 6. Zwróć wyniki
        return {
          purchaseId: purchase.id,
          transactionId: transaction.id,
          amount: transaction.amount.toString(),
          status: transaction.status.toString()
        };
      } catch (error) {
        // W przypadku błędu wycofaj transakcję
        await this.rollbackDatabaseTransaction(dbTransaction);
        throw error;
      }
    }
    
    /**
     * Rozpoczyna transakcję bazodanową
     * @private
     * @returns {Promise<Object>} Obiekt transakcji
     */
    async beginDatabaseTransaction() {
      // Implementacja zależna od używanej bazy danych
      // W przypadku Supabase można użyć klienta z opcją `.transaction()`
      return { id: Date.now().toString() };
    }
    
    /**
     * Zatwierdza transakcję bazodanową
     * @private
     * @param {Object} transaction Obiekt transakcji
     * @returns {Promise<void>}
     */
    async commitDatabaseTransaction(transaction) {
      // Implementacja zależna od używanej bazy danych
    }
    
    /**
     * Wycofuje transakcję bazodanową
     * @private
     * @param {Object} transaction Obiekt transakcji
     * @returns {Promise<void>}
     */
    async rollbackDatabaseTransaction(transaction) {
      // Implementacja zależna od używanej bazy danych
    }
  }
  
  module.exports = TransactionService;