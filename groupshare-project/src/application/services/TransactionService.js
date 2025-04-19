// src/application/services/TransactionService.js

const { 
  ResourceNotFoundException,
  BusinessRuleViolationException 
} = require('../exceptions');
const { Id } = require('../../domain/shared/value-objects/Id');

/**
 * Serwis zarządzający transakcjami z wykorzystaniem wzorca Unit of Work
 */
class TransactionService {
  /**
   * @param {UnitOfWorkFactory} unitOfWorkFactory - Fabryka Unit of Work
   * @param {EventPublisher} eventPublisher - Publisher zdarzeń domenowych
   */
  constructor(unitOfWorkFactory, eventPublisher) {
    this.unitOfWorkFactory = unitOfWorkFactory;
    this.eventPublisher = eventPublisher;
  }
  
  /**
   * Realizuje transakcję zakupu subskrypcji
   * @param {string} userId - ID kupującego
   * @param {string} subscriptionId - ID subskrypcji
   * @param {string} paymentMethod - Metoda płatności
   * @param {string} currency - Waluta
   * @returns {Promise<Object>} Dane transakcji
   * @throws {ApplicationException} W przypadku błędu
   */
  async processPurchaseTransaction(userId, subscriptionId, paymentMethod, currency = 'PLN') {
    // Utwórz Unit of Work
    const unitOfWork = this.unitOfWorkFactory.create();
    
    try {
      // Rozpocznij transakcję
      await unitOfWork.begin();
      
      // Pobierz subskrypcję
      const subscription = await unitOfWork.subscriptionRepository.findById(subscriptionId);
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
      const group = await unitOfWork.groupRepository.findById(subscription.groupId);
      const sellerId = group.ownerId;
      
      // 1. Utwórz rekord zakupu
      const Purchase = require('../../domain/purchase/Purchase');
      const purchase = Purchase.create(
        Id.create(),
        userId,
        subscriptionId
      );
      
      await unitOfWork.purchaseRepository.save(purchase);
      
      // 2. Zmniejsz liczbę dostępnych miejsc
      subscription.reserveSlots(1, userId);
      await unitOfWork.subscriptionRepository.save(subscription);
      
      // 3. Utwórz transakcję płatności
      const Transaction = require('../../domain/purchase/entities/Transaction');
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
      
      await unitOfWork.transactionRepository.save(transaction);
      
      // 4. Zapisz transakcję w rekordzie zakupu
      purchase.addTransaction(transaction);
      await unitOfWork.purchaseRepository.save(purchase);
      
      // 5. Zatwierdź transakcję bazodanową
      await unitOfWork.commit();
      
      // 6. Opublikuj zdarzenia domenowe
      const events = [
        ...purchase.getDomainEvents(),
        ...subscription.getDomainEvents(),
        ...transaction.getDomainEvents()
      ];
      
      await this.eventPublisher.publishAll(events);
      
      // Wyczyść zdarzenia po opublikowaniu
      purchase.clearDomainEvents();
      subscription.clearDomainEvents();
      transaction.clearDomainEvents();
      
      // 7. Zwróć wyniki
      return {
        purchaseId: purchase.id,
        transactionId: transaction.id,
        amount: transaction.amount.toString(),
        status: transaction.status.toString(),
        paymentMethod: transaction.paymentMethod.toString()
      };
    } catch (error) {
      // W przypadku błędu wycofaj transakcję
      try {
        await unitOfWork.rollback();
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
        // Kontynuuj, aby zwrócić oryginalny błąd
      }
      
      // Rethrow original error
      throw error;
    }
  }
  
  /**
   * Kompletuje transakcję po otrzymaniu potwierdzenia płatności
   * @param {string} transactionId - ID transakcji
   * @param {string} paymentId - ID płatności u dostawcy
   * @returns {Promise<Object>} Wynik kompletacji
   */
  async completeTransaction(transactionId, paymentId) {
    const unitOfWork = this.unitOfWorkFactory.create();
    
    try {
      await unitOfWork.begin();
      
      // Pobierz transakcję
      const transaction = await unitOfWork.transactionRepository.findById(transactionId);
      if (!transaction) {
        throw new ResourceNotFoundException('Transaction not found', 'transaction', transactionId);
      }
      
      // Sprawdź czy transakcja nie jest już zakończona
      if (transaction.status.isCompleted()) {
        // Transakcja już zakończona, zwróć informację bez błędu
        return {
          success: true,
          purchaseId: transaction.purchaseId,
          status: transaction.status.toString(),
          alreadyCompleted: true
        };
      }
      
      // Oznacz transakcję jako zakończoną
      transaction.complete(paymentId);
      await unitOfWork.transactionRepository.save(transaction);
      
      // Pobierz zakup
      const purchase = await unitOfWork.purchaseRepository.findById(transaction.purchaseId);
      
      // Oznacz zakup jako zakończony
      purchase.complete();
      await unitOfWork.purchaseRepository.save(purchase);
      
      // Zatwierdź transakcję bazodanową
      await unitOfWork.commit();
      
      // Opublikuj zdarzenia domenowe
      const events = [
        ...transaction.getDomainEvents(),
        ...purchase.getDomainEvents()
      ];
      
      await this.eventPublisher.publishAll(events);
      
      // Wyczyść zdarzenia po opublikowaniu
      transaction.clearDomainEvents();
      purchase.clearDomainEvents();
      
      return {
        success: true,
        purchaseId: purchase.id,
        status: transaction.status.toString()
      };
    } catch (error) {
      // W przypadku błędu wycofaj transakcję
      try {
        await unitOfWork.rollback();
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
      
      throw error;
    }
  }
  
  /**
   * Inicjuje zwrot płatności
   * @param {string} transactionId - ID transakcji
   * @param {string} reason - Powód zwrotu
   * @param {string} requestedBy - ID użytkownika żądającego zwrotu
   * @returns {Promise<Object>} Wynik zwrotu
   */
  async refundTransaction(transactionId, reason, requestedBy) {
    const unitOfWork = this.unitOfWorkFactory.create();
    
    try {
      await unitOfWork.begin();
      
      // Pobierz transakcję
      const transaction = await unitOfWork.transactionRepository.findById(transactionId);
      if (!transaction) {
        throw new ResourceNotFoundException('Transaction not found', 'transaction', transactionId);
      }
      
      // Sprawdź czy transakcja jest zakończona
      if (!transaction.status.isCompleted()) {
        throw new BusinessRuleViolationException(
          'Only completed transactions can be refunded',
          'invalid_transaction_status'
        );
      }
      
      // Sprawdź czy transakcja nie jest już zwrócona
      if (transaction.status.isRefunded()) {
        return {
          success: true,
          alreadyRefunded: true,
          transactionId
        };
      }
      
      // Oznacz transakcję jako zwróconą
      transaction.refund();
      await unitOfWork.transactionRepository.save(transaction);
      
      // Pobierz zakup
      const purchase = await unitOfWork.purchaseRepository.findById(transaction.purchaseId);
      
      // Oznacz zakup jako problematyczny
      purchase.markAsProblem();
      await unitOfWork.purchaseRepository.save(purchase);
      
      // Pobierz subskrypcję
      const subscription = await unitOfWork.subscriptionRepository.findById(purchase.subscriptionId);
      
      // Przywróć miejsce w subskrypcji, jeśli to możliwe
      if (subscription) {
        // Zwiększ liczbę dostępnych miejsc
        subscription.update({
          slotsAvailable: subscription.slotsAvailable + 1
        });
        await unitOfWork.subscriptionRepository.save(subscription);
      }
      
      // Zatwierdź transakcję bazodanową
      await unitOfWork.commit();
      
      // Opublikuj zdarzenia domenowe
      const events = [
        ...transaction.getDomainEvents(),
        ...purchase.getDomainEvents()
      ];
      
      if (subscription) {
        events.push(...subscription.getDomainEvents());
        subscription.clearDomainEvents();
      }
      
      await this.eventPublisher.publishAll(events);
      
      // Wyczyść zdarzenia po opublikowaniu
      transaction.clearDomainEvents();
      purchase.clearDomainEvents();
      
      return {
        success: true,
        transactionId: transaction.id,
        purchaseId: purchase.id,
        status: transaction.status.toString()
      };
    } catch (error) {
      // W przypadku błędu wycofaj transakcję
      try {
        await unitOfWork.rollback();
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
      
      throw error;
    }
  }
}

module.exports = TransactionService;