const { Repository } = require('../shared/Entity');

/**
 * @interface SubscriptionRepository
 * @extends Repository<Subscription>
 */
class SubscriptionRepository extends Repository {
  /**
   * Find subscriptions by group ID
   * @param {string} groupId - Group ID
   * @returns {Promise<Array<Subscription>>} List of subscriptions
   */
  async findByGroupId(groupId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find subscriptions by platform ID
   * @param {string} platformId - Platform ID
   * @returns {Promise<Array<Subscription>>} List of subscriptions
   */
  async findByPlatformId(platformId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find available subscriptions (with free slots)
   * @returns {Promise<Array<Subscription>>} List of available subscriptions
   */
  async findAvailable() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find subscriptions in a price range
   * @param {number} min - Minimum price
   * @param {number} max - Maximum price
   * @returns {Promise<Array<Subscription>>} List of subscriptions
   */
  async findByPriceRange(min, max) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find subscriptions by status
   * @param {string} status - Subscription status
   * @returns {Promise<Array<Subscription>>} List of subscriptions
   */
  async findByStatus(status) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Update available slots
   * @param {string} id - Subscription ID
   * @param {number} slotsAvailable - New number of available slots
   * @returns {Promise<void>}
   */
  async updateAvailableSlots(id, slotsAvailable) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get available slots
   * @param {string} id - Subscription ID
   * @returns {Promise<number>} Number of available slots
   */
  async getAvailableSlots(id) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Save access instructions
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} accessInstructions - Access instructions data
   * @returns {Promise<void>}
   */
  async saveAccessInstructions(subscriptionId, accessInstructions) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get access instructions
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object|null>} Access instructions data
   */
  async getAccessInstructions(subscriptionId) {
    throw new Error('Method not implemented');
  }
}

// Export all subscription domain components
module.exports = {
  Subscription,
  SubscriptionPlatform,
  SubscriptionRepository,
  SubscriptionCreatedEvent,
  SlotsPurchasedEvent,
  SubscriptionStatus,
  AccessInstructions
};