// src/application/ports/queries/SubscriptionQueries.js

/**
 * Interfejs zapytań dla subskrypcji
 * @interface
 */
class SubscriptionQueries {
    /**
     * Wyszukuje subskrypcje według kryteriów z paginacją
     * @param {Object} criteria - Kryteria wyszukiwania
     * @param {string} [criteria.platformId] - ID platformy
     * @param {number} [criteria.minPrice] - Minimalna cena
     * @param {number} [criteria.maxPrice] - Maksymalna cena
     * @param {boolean} [criteria.availableOnly=false] - Tylko z dostępnymi miejscami
     * @param {string} [criteria.status] - Status subskrypcji
     * @param {string} [criteria.groupId] - ID grupy
     * @param {Object} pagination - Opcje paginacji
     * @param {number} [pagination.page=1] - Numer strony
     * @param {number} [pagination.limit=20] - Limit wyników
     * @param {string} [pagination.orderBy='createdAt'] - Pole sortowania
     * @param {boolean} [pagination.ascending=false] - Czy sortować rosnąco
     * @returns {Promise<Object>} Wyniki z paginacją
     */
    async findByCriteria(criteria, pagination) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Pobiera subskrypcję ze wszystkimi potrzebnymi danymi dla szczegółowego widoku
     * @param {string} id - ID subskrypcji
     * @returns {Promise<Object>} Subskrypcja z powiązanymi danymi
     */
    async getSubscriptionDetails(id) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Pobiera subskrypcje dla grupy z podstawowymi informacjami
     * @param {string} groupId - ID grupy
     * @returns {Promise<Array<Object>>} Lista subskrypcji
     */
    async getSubscriptionsForGroup(groupId) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Sprawdza, czy istnieją subskrypcje dla grupy
     * @param {string} groupId - ID grupy
     * @returns {Promise<boolean>} Czy grupa ma subskrypcje
     */
    async hasSubscriptions(groupId) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Pobiera statystyki subskrypcji dla grupy
     * @param {string} groupId - ID grupy
     * @returns {Promise<Object>} Statystyki subskrypcji
     */
    async getSubscriptionStats(groupId) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Pobiera popularne platformy z liczbą subskrypcji
     * @param {number} [limit=5] - Limit wyników
     * @returns {Promise<Array<Object>>} Lista platform z liczbą subskrypcji
     */
    async getPopularPlatforms(limit = 5) {
      throw new Error('Method not implemented');
    }
  }
  
  module.exports = SubscriptionQueries;