const { ValueObject } = require('../../shared/Entity');

/**
 * Status of a subscription offer
 * @extends ValueObject
 */
class SubscriptionStatus extends ValueObject {
  static ACTIVE = new SubscriptionStatus('active');
  static PAUSED = new SubscriptionStatus('paused');
  static INACTIVE = new SubscriptionStatus('inactive');
  
  /**
   * @param {string} status - The subscription status
   * @private
   */
  constructor(status) {
    super();
    this._status = status;
  }
  
  /**
   * Create a subscription status from string
   * @param {string} status - The subscription status string
   * @returns {SubscriptionStatus} A SubscriptionStatus instance
   * @throws {Error} If the status is invalid
   */
  static fromString(status) {
    switch (status.toLowerCase()) {
      case 'active':
        return this.ACTIVE;
      case 'paused':
        return this.PAUSED;
      case 'inactive':
        return this.INACTIVE;
      default:
        throw new Error(`Invalid subscription status: ${status}`);
    }
  }
  
  /**
   * Get the status value
   * @returns {string} The subscription status
   */
  get value() {
    return this._status;
  }
  
  /**
   * Check if the subscription is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this === SubscriptionStatus.ACTIVE;
  }
  
  /**
   * Compare with another SubscriptionStatus
   * @param {SubscriptionStatus} other - Another SubscriptionStatus to compare with
   * @returns {boolean} True if both statuses have the same value
   */
  equals(other) {
    if (!(other instanceof SubscriptionStatus)) return false;
    return this._status === other.value;
  }
  
  /**
   * Convert to string
   * @returns {string} String representation
   */
  toString() {
    return this._status;
  }
}