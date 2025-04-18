// src/infrastructure/repositories/RepositoryFactory.js

import SupabaseUserRepository from './SupabaseUserRepository';
import SupabaseGroupRepository from './SupabaseGroupRepository';
import SupabaseSubscriptionRepository from './SupabaseSubscriptionRepository';
import SupabasePurchaseRepository from './SupabasePurchaseRepository';
import SupabaseTransactionRepository from './SupabaseTransactionRepository';
import SupabasePlatformRepository from './SupabasePlatformRepository';
import SupabaseAccessInstructionRepository from './SupabaseAccessInstructionRepository';
import SupabaseAccessTokenRepository from './SupabaseAccessTokenRepository';
import SupabaseEncryptionKeyRepository from './SupabaseEncryptionKeyRepository';
import SupabaseNotificationRepository from './SupabaseNotificationRepository';
import SupabaseDisputeRepository from './SupabaseDisputeRepository';
import SupabaseGroupInvitationRepository from './SupabaseGroupInvitationRepository';

/**
 * Fabryka dla repozytoriów
 */
class RepositoryFactory {
  // Prywatne pole dla instancji
  static #instances = {};
  
  /**
   * Tworzy lub zwraca instancję repozytorium
   * @template T
   * @param {string} name Nazwa repozytorium
   * @param {Function} constructor Konstruktor repozytorium
   * @returns {T} Instancja repozytorium
   */
  static #getOrCreate(name, constructor) {
    if (!this.#instances[name]) {
      this.#instances[name] = new constructor();
    }
    
    return this.#instances[name];
  }
  
  /**
   * Zwraca repozytorium użytkowników
   * @returns {SupabaseUserRepository} Repozytorium
   */
  static getUserRepository() {
    return this.#getOrCreate('user', SupabaseUserRepository);
  }
  
  /**
   * Zwraca repozytorium grup
   * @returns {SupabaseGroupRepository} Repozytorium
   */
  static getGroupRepository() {
    return this.#getOrCreate('group', SupabaseGroupRepository);
  }
  
  /**
   * Zwraca repozytorium subskrypcji
   * @returns {SupabaseSubscriptionRepository} Repozytorium
   */
  static getSubscriptionRepository() {
    return this.#getOrCreate('subscription', SupabaseSubscriptionRepository);
  }
  
  /**
   * Zwraca repozytorium zakupów
   * @returns {SupabasePurchaseRepository} Repozytorium
   */
  static getPurchaseRepository() {
    return this.#getOrCreate('purchase', SupabasePurchaseRepository);
  }
  
  /**
   * Zwraca repozytorium transakcji
   * @returns {SupabaseTransactionRepository} Repozytorium
   */
  static getTransactionRepository() {
    return this.#getOrCreate('transaction', SupabaseTransactionRepository);
  }
  
  // ... podobne metody dla pozostałych repozytoriów
}

export default RepositoryFactory;