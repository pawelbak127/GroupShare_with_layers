const { Repository } = require('../shared/Entity');

/**
 * @interface PurchaseRepository
 * @extends Repository<Purchase>
 */
class PurchaseRepository extends Repository {
  /**
   * Find purchases by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array<Purchase>>} List of purchases
   */
  async findByUserId(userId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find purchases by subscription ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Array<Purchase>>} List of purchases
   */
  async findBySubscriptionId(subscriptionId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find purchases by status
   * @param {string} status - Purchase status
   * @returns {Promise<Array<Purchase>>} List of purchases
   */
  async findByStatus(status) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find purchases with unconfirmed access
   * @returns {Promise<Array<Purchase>>} List of purchases
   */
  async findUnconfirmedAccess() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Update purchase status
   * @param {string} id - Purchase ID
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateStatus(id, status) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Mark access as provided
   * @param {string} id - Purchase ID
   * @returns {Promise<void>}
   */
  async markAccessProvided(id) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Mark access as confirmed
   * @param {string} id - Purchase ID
   * @returns {Promise<void>}
   */
  async markAccessConfirmed(id) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Save transaction
   * @param {string} purchaseId - Purchase ID
   * @param {Transaction} transaction - Transaction object
   * @returns {Promise<void>}
   */
  async saveTransaction(purchaseId, transaction) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get transaction
   * @param {string} purchaseId - Purchase ID
   * @returns {Promise<Transaction|null>} Transaction or null
   */
  async getTransaction(purchaseId) {
    throw new Error('Method not implemented');
  }
}

// Export all purchase domain components
module.exports = {
  Purchase,
  Transaction,
  PurchaseRepository,
  PurchaseCreatedEvent,
  PurchaseCompletedEvent,
  PurchaseStatus,
  TransactionStatus,
  PaymentMethod
};