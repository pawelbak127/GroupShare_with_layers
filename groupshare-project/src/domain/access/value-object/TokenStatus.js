const { ValueObject } = require('../../shared/Entity');

/**
 * Status of an access token
 * @extends ValueObject
 */
class TokenStatus extends ValueObject {
  static ACTIVE = new TokenStatus('active');
  static USED = new TokenStatus('used');
  static EXPIRED = new TokenStatus('expired');
  
  /**
   * @param {string} status - The token status
   * @private
   */
  constructor(status) {
    super();
    this._status = status;
  }
  
  /**
   * Create a token status from string
   * @param {string} status - The token status string
   * @returns {TokenStatus} A TokenStatus instance
   * @throws {Error} If the status is invalid
   */
  static fromString(status) {
    switch (status.toLowerCase()) {
      case 'active':
        return this.ACTIVE;
      case 'used':
        return this.USED;
      case 'expired':
        return this.EXPIRED;
      default:
        throw new Error(`Invalid token status: ${status}`);
    }
  }
  
  /**
   * Get the status value
   * @returns {string} The token status
   */
  get value() {
    return this._status;
  }
  
  /**
   * Check if the token is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this === TokenStatus.ACTIVE;
  }
  
  /**
   * Check if the token is used
   * @returns {boolean} True if used
   */
  isUsed() {
    return this === TokenStatus.USED;
  }
  
  /**
   * Check if the token is expired
   * @returns {boolean} True if expired
   */
  isExpired() {
    return this === TokenStatus.EXPIRED;
  }
  
  /**
   * Compare with another TokenStatus
   * @param {TokenStatus} other - Another TokenStatus to compare with
   * @returns {boolean} True if both statuses have the same value
   */
  equals(other) {
    if (!(other instanceof TokenStatus)) return false;
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