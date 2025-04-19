// src/infrastructure/persistence/supabase/SupabaseUnitOfWork.js

const UnitOfWork = require('../../../application/ports/persistence/UnitOfWork');

/**
 * Implementacja Unit of Work dla Supabase
 * @implements {UnitOfWork}
 */
class SupabaseUnitOfWork extends UnitOfWork {
  /**
   * @param {Object} supabaseClient - Klient Supabase
   * @param {Object} repositories - Obiekty repozytoriów
   */
  constructor(supabaseClient, repositories) {
    super();
    this.supabaseClient = supabaseClient;
    this.baseRepositories = repositories;
    this.transactionClient = null;
    this.transactionRepositories = null;
  }
  
  /**
   * Rozpoczyna nową transakcję bazodanową
   * @returns {Promise<void>}
   */
  async begin() {
    // Supabase nie ma natywnego API dla transakcji, więc użyjemy PostgreSQL
    try {
      this.transactionClient = this.supabaseClient.getClient();
      await this.transactionClient.query('BEGIN');
      
      // Inicjalizuj repozytoria z kontekstem transakcji
      this.transactionRepositories = {
        user: this.createRepositoryWithTransaction(this.baseRepositories.user),
        group: this.createRepositoryWithTransaction(this.baseRepositories.group),
        subscription: this.createRepositoryWithTransaction(this.baseRepositories.subscription),
        purchase: this.createRepositoryWithTransaction(this.baseRepositories.purchase),
        transaction: this.createRepositoryWithTransaction(this.baseRepositories.transaction),
        platform: this.createRepositoryWithTransaction(this.baseRepositories.platform),
        accessInstruction: this.createRepositoryWithTransaction(this.baseRepositories.accessInstruction),
        accessToken: this.createRepositoryWithTransaction(this.baseRepositories.accessToken)
      };
      
      console.log('Transaction started');
    } catch (error) {
      console.error('Error starting transaction:', error);
      throw error;
    }
  }
  
  /**
   * Zatwierdza transakcję bazodanową
   * @returns {Promise<void>}
   */
  async commit() {
    if (!this.transactionClient) {
      throw new Error('No active transaction');
    }
    
    try {
      await this.transactionClient.query('COMMIT');
      console.log('Transaction committed');
    } catch (error) {
      console.error('Error committing transaction:', error);
      // W przypadku błędu podczas zatwierdzania, spróbuj wykonać rollback
      try {
        await this.transactionClient.query('ROLLBACK');
        console.log('Transaction rolled back due to commit error');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      throw error;
    } finally {
      this.transactionClient = null;
      this.transactionRepositories = null;
    }
  }
  
  /**
   * Wycofuje transakcję bazodanową
   * @returns {Promise<void>}
   */
  async rollback() {
    if (!this.transactionClient) {
      throw new Error('No active transaction');
    }
    
    try {
      await this.transactionClient.query('ROLLBACK');
      console.log('Transaction rolled back');
    } catch (error) {
      console.error('Error rolling back transaction:', error);
      throw error;
    } finally {
      this.transactionClient = null;
      this.transactionRepositories = null;
    }
  }
  
  /**
   * Tworzy wersję repozytorium działającą w kontekście transakcji
   * @private
   * @param {Object} repository - Bazowe repozytorium
   * @returns {Object} Repozytorium z kontekstem transakcji
   */
  createRepositoryWithTransaction(repository) {
    // Tworzymy proxy, które przekierowuje wywołania metod do oryginalnego repozytorium,
    // ale z kontekstem transakcji
    const transactionContext = this.transactionClient;
    
    return new Proxy(repository, {
      get(target, prop) {
        if (typeof target[prop] === 'function') {
          return function(...args) {
            // Dodajemy kontekst transakcji do wywołań
            return target[prop].apply(target, [...args, transactionContext]);
          };
        }
        return target[prop];
      }
    });
  }
  
  // Gettery dla repozytoriów
  get userRepository() {
    return this.transactionRepositories?.user || this.baseRepositories.user;
  }
  
  get groupRepository() {
    return this.transactionRepositories?.group || this.baseRepositories.group;
  }
  
  get subscriptionRepository() {
    return this.transactionRepositories?.subscription || this.baseRepositories.subscription;
  }
  
  get purchaseRepository() {
    return this.transactionRepositories?.purchase || this.baseRepositories.purchase;
  }
  
  get transactionRepository() {
    return this.transactionRepositories?.transaction || this.baseRepositories.transaction;
  }
  
  get platformRepository() {
    return this.transactionRepositories?.platform || this.baseRepositories.platform;
  }
  
  get accessInstructionRepository() {
    return this.transactionRepositories?.accessInstruction || this.baseRepositories.accessInstruction;
  }
  
  get accessTokenRepository() {
    return this.transactionRepositories?.accessToken || this.baseRepositories.accessToken;
  }
}

module.exports = SupabaseUnitOfWork;