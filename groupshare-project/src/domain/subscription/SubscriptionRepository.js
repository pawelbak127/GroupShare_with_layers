// src/domain/subscription/SubscriptionRepository.js

const { Repository } = require('../shared/Entity');

/**
 * Repozytorium subskrypcji
 * @extends Repository
 */
class SubscriptionRepository extends Repository {
  /**
   * Zapisuje subskrypcję
   * @param {Subscription} subscription - Subskrypcja do zapisania
   * @returns {Promise<Subscription>} Zapisana subskrypcja
   */
  async save(subscription) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Znajduje subskrypcję po ID
   * @param {string} id - ID subskrypcji
   * @returns {Promise<Subscription|null>} Znaleziona subskrypcja lub null
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Pobiera dostępne sloty dla subskrypcji
   * @param {string} id - ID subskrypcji
   * @returns {Promise<number>} Liczba dostępnych slotów
   */
  async getAvailableSlots(id) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Aktualizuje dostępne sloty dla subskrypcji
   * @param {string} id - ID subskrypcji
   * @param {number} count - Nowa liczba dostępnych slotów
   * @returns {Promise<void>}
   */
  async updateAvailableSlots(id, count) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Znajduje subskrypcje według określonych kryteriów
   * @param {Object} criteria - Kryteria wyszukiwania
   * @returns {Promise<Array<Subscription>>} Lista subskrypcji
   */
  async findByCriteria(criteria) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Usuwa subskrypcję
   * @param {string} id - ID subskrypcji
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Sprawdza, czy subskrypcja istnieje
   * @param {string} id - ID subskrypcji
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Zapisuje instrukcje dostępu dla subskrypcji
   * @param {string} subscriptionId - ID subskrypcji
   * @param {Object} accessInstructions - Dane instrukcji dostępu
   * @returns {Promise<void>}
   */
  async saveAccessInstructions(subscriptionId, accessInstructions) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Pobiera instrukcje dostępu dla subskrypcji
   * @param {string} subscriptionId - ID subskrypcji
   * @returns {Promise<Object|null>} Dane instrukcji dostępu lub null
   */
  async getAccessInstructions(subscriptionId) {
    throw new Error('Method not implemented');
  }
}

module.exports = SubscriptionRepository;