const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when access is confirmed by the buyer
 * @extends DomainEvent
 */
class AccessConfirmedEvent extends DomainEvent {
  /**
   * @param {string} purchaseId - The purchase ID
   * @param {string} userId - The user ID confirming access
   * @param {boolean} isWorking - Whether the access is working
   */
  constructor(purchaseId, userId, isWorking) {
    super();
    this._purchaseId = purchaseId;
    this._userId = userId;
    this._isWorking = isWorking;
  }
  
  /**
   * Get the purchase ID
   * @returns {string} The purchase ID
   */
  get purchaseId() {
    return this._purchaseId;
  }
  
  /**
   * Get the user ID
   * @returns {string} The user ID
   */
  get userId() {
    return this._userId;
  }
  
  /**
   * Check if the access is working
   * @returns {boolean} True if working
   */
  get isWorking() {
    return this._isWorking;
  }
}
