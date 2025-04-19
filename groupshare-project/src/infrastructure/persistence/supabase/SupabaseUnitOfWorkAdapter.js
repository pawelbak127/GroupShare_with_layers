// /src/infrastructure/persistence/supabase/SupabaseUnitOfWorkAdapter.js

import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { ApplicationException } from '@/application/exceptions';

/**
 * Adapter Unit of Work implementujący wzorzec projektowy dla transakcji bazodanowych
 * Pozwala na wykonanie wielu operacji bazodanowych jako jednej transakcji atomowej
 */
export class SupabaseUnitOfWorkAdapter {
  /**
   * Inicjalizuje adapter Unit of Work
   * @param {Object} repositories - Obiekty repozytoriów
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(repositories, options = {}) {
    this.baseRepositories = repositories;
    this.options = {
      debug: process.env.NODE_ENV !== 'production',
      retryCount: 3,
      ...options
    };
    
    this.transactionClient = null;
    this.transactionRepositories = null;
    this.isTransactionActive = false;
  }
  
  /**
   * Rozpoczyna nową transakcję bazodanową
   * @returns {Promise<void>}
   * @throws {ApplicationException} - Jeśli nie udało się rozpocząć transakcji
   */
  async begin() {
    if (this.isTransactionActive) {
      throw new ApplicationException('Transaction already started', 'TRANSACTION_ERROR');
    }
    
    try {
      // W Supabase nie ma natywnego API dla transakcji w kliencie JavaScript,
      // więc używamy bezpośredniego klienta PostgreSQL
      this.transactionClient = supabaseAdmin.getClient();
      await this.transactionClient.query('BEGIN');
      
      // Inicjalizuj repozytoria z kontekstem transakcji
      this.transactionRepositories = {};
      
      // Dla każdego repozytorium bazowego, utwórz wersję z kontekstem transakcji
      for (const [name, repository] of Object.entries(this.baseRepositories)) {
        this.transactionRepositories[name] = this.createRepositoryWithTransaction(repository);
      }
      
      this.isTransactionActive = true;
      
      if (this.options.debug) {
        console.log('Transaction started');
      }
    } catch (error) {
      console.error('Error starting transaction:', error);
      this.transactionClient = null;
      this.transactionRepositories = null;
      this.isTransactionActive = false;
      throw new ApplicationException('Failed to start transaction', 'TRANSACTION_ERROR');
    }
  }
  
  /**
   * Zatwierdza transakcję bazodanową
   * @returns {Promise<void>}
   * @throws {ApplicationException} - Jeśli nie udało się zatwierdzić transakcji
   */
  async commit() {
    if (!this.isTransactionActive) {
      throw new ApplicationException('No active transaction', 'TRANSACTION_ERROR');
    }
    
    try {
      await this.transactionClient.query('COMMIT');
      
      if (this.options.debug) {
        console.log('Transaction committed');
      }
    } catch (error) {
      console.error('Error committing transaction:', error);
      
      // W przypadku błędu podczas zatwierdzania, spróbuj wycofać zmiany
      try {
        await this.transactionClient.query('ROLLBACK');
        if (this.options.debug) {
          console.log('Transaction rolled back due to commit error');
        }
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      
      throw new ApplicationException('Failed to commit transaction', 'TRANSACTION_ERROR');
    } finally {
      this.transactionClient = null;
      this.transactionRepositories = null;
      this.isTransactionActive = false;
    }
  }
  
  /**
   * Wycofuje transakcję bazodanową
   * @returns {Promise<void>}
   * @throws {ApplicationException} - Jeśli nie udało się wycofać transakcji
   */
  async rollback() {
    if (!this.isTransactionActive) {
      throw new ApplicationException('No active transaction', 'TRANSACTION_ERROR');
    }
    
    try {
      await this.transactionClient.query('ROLLBACK');
      
      if (this.options.debug) {
        console.log('Transaction rolled back');
      }
    } catch (error) {
      console.error('Error rolling back transaction:', error);
      throw new ApplicationException('Failed to rollback transaction', 'TRANSACTION_ERROR');
    } finally {
      this.transactionClient = null;
      this.transactionRepositories = null;
      this.isTransactionActive = false;
    }
  }
  
  /**
   * Tworzy wersję repozytorium działającą w kontekście transakcji
   * @param {Object} repository - Bazowe repozytorium
   * @returns {Object} - Repozytorium z kontekstem transakcji
   * @private
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
  
  /**
   * Wykonuje funkcję w kontekście transakcji
   * @param {Function} callback - Funkcja do wykonania
   * @returns {Promise<any>} - Wynik funkcji
   * @throws {Error} - Jeśli funkcja rzuci wyjątek
   */
  async execute(callback) {
    let attempt = 0;
    let result;
    
    while (attempt < this.options.retryCount) {
      try {
        await this.begin();
        result = await callback(this);
        await this.commit();
        return result;
      } catch (error) {
        attempt++;
        
        if (this.isTransactionActive) {
          await this.rollback();
        }
        
        if (attempt >= this.options.retryCount) {
          throw error;
        }
        
        if (this.options.debug) {
          console.log(`Transaction failed, retrying (${attempt}/${this.options.retryCount})...`);
        }
        
        // Poczekaj losowy czas przed ponowieniem próby
        const delay = Math.floor(Math.random() * 100) + 50 * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  /**
   * Pobiera repozytorium z kontekstem transakcji
   * @param {string} name - Nazwa repozytorium
   * @returns {Object} - Repozytorium
   * @throws {Error} - Jeśli repozytorium nie istnieje
   */
  getRepository(name) {
    if (this.isTransactionActive) {
      if (!this.transactionRepositories[name]) {
        throw new Error(`Repository not found: ${name}`);
      }
      return this.transactionRepositories[name];
    }
    
    if (!this.baseRepositories[name]) {
      throw new Error(`Repository not found: ${name}`);
    }
    
    return this.baseRepositories[name];
  }
  
  /**
   * Pobiera informację czy transakcja jest aktywna
   * @returns {boolean} - Czy transakcja jest aktywna
   */
  isActive() {
    return this.isTransactionActive;
  }
}

export default SupabaseUnitOfWorkAdapter;