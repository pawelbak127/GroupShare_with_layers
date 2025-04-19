// src/application/ports/persistence/UnitOfWork.js

/**
 * Interfejs dla wzorca Unit of Work
 * @interface
 */
class UnitOfWork {
    /**
     * Rozpoczyna nową transakcję bazodanową
     * @returns {Promise<void>}
     */
    async begin() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Zatwierdza transakcję bazodanową
     * @returns {Promise<void>}
     */
    async commit() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Wycofuje transakcję bazodanową
     * @returns {Promise<void>}
     */
    async rollback() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Repozytorium użytkowników w kontekście bieżącej transakcji
     * @returns {UserRepository}
     */
    get userRepository() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Repozytorium grup w kontekście bieżącej transakcji
     * @returns {GroupRepository}
     */
    get groupRepository() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Repozytorium subskrypcji w kontekście bieżącej transakcji
     * @returns {SubscriptionRepository}
     */
    get subscriptionRepository() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Repozytorium zakupów w kontekście bieżącej transakcji
     * @returns {PurchaseRepository}
     */
    get purchaseRepository() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Repozytorium transakcji w kontekście bieżącej transakcji
     * @returns {TransactionRepository}
     */
    get transactionRepository() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Repozytorium platform w kontekście bieżącej transakcji
     * @returns {PlatformRepository}
     */
    get platformRepository() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Repozytorium instrukcji dostępu w kontekście bieżącej transakcji
     * @returns {AccessInstructionRepository}
     */
    get accessInstructionRepository() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Repozytorium tokenów dostępu w kontekście bieżącej transakcji
     * @returns {AccessTokenRepository}
     */
    get accessTokenRepository() {
      throw new Error('Method not implemented');
    }
  }
  
  module.exports = UnitOfWork;