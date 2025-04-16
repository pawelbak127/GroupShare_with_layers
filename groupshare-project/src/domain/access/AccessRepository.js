const { Repository } = require('../shared/Entity');

/**
 * @interface AccessRepository
 * @extends Repository<AccessToken>
 */
class AccessRepository extends Repository {
  /**
   * Find tokens for a specific purchase
   * @param {string} purchaseId - Purchase ID
   * @returns {Promise<Array<AccessToken>>} List of tokens
   */
  async findByPurchaseId(purchaseId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find a valid token for a purchase
   * @param {string} purchaseId - Purchase ID
   * @returns {Promise<AccessToken|null>} Token or null if not found
   */
  async findValidTokenForPurchase(purchaseId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find a token by hash
   * @param {string} tokenHash - Token hash
   * @returns {Promise<AccessToken|null>} Token or null if not found
   */
  async findByTokenHash(tokenHash) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Mark a token as used
   * @param {string} id - Token ID
   * @param {string} [ipAddress] - IP address
   * @param {string} [userAgent] - User agent
   * @returns {Promise<void>}
   */
  async markTokenAsUsed(id, ipAddress, userAgent) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Create a dispute
   * @param {Dispute} dispute - Dispute object
   * @returns {Promise<string>} ID of the created dispute
   */
  async createDispute(dispute) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find disputes reported by a user
   * @param {string} reporterId - Reporter user ID
   * @returns {Promise<Array<Dispute>>} List of disputes
   */
  async findDisputesByReporterId(reporterId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find disputes for a specific entity
   * @param {string} entityId - Entity ID
   * @returns {Promise<Array<Dispute>>} List of disputes
   */
  async findDisputesByReportedEntityId(entityId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Update a dispute's status
   * @param {string} id - Dispute ID
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateDisputeStatus(id, status) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find pending disputes
   * @returns {Promise<Array<Dispute>>} List of pending disputes
   */
  async findPendingDisputes() {
    throw new Error('Method not implemented');
  }
}

// Export all access domain components
module.exports = {
  AccessToken,
  Dispute,
  AccessRepository,
  AccessGrantedEvent,
  AccessConfirmedEvent,
  DisputeCreatedEvent,
  TokenStatus,
  DisputeStatus,
  DisputeType,
  Token
};