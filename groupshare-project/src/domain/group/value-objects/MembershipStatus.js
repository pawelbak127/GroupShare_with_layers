const { ValueObject } = require('../../shared/Entity');

/**
 * Membership status for a group member
 * @extends ValueObject
 */
class MembershipStatus extends ValueObject {
  static ACTIVE = new MembershipStatus('active');
  static PENDING = new MembershipStatus('pending');
  static INACTIVE = new MembershipStatus('inactive');
  
  /**
   * @param {string} status - The membership status
   * @private
   */
  constructor(status) {
    super();
    this._status = status;
  }
  
  /**
   * Create a membership status from string
   * @param {string} status - The membership status string
   * @returns {MembershipStatus} A MembershipStatus instance
   * @throws {Error} If the status is invalid
   */
  static fromString(status) {
    switch (status.toLowerCase()) {
      case 'active':
        return this.ACTIVE;
      case 'pending':
        return this.PENDING;
      case 'inactive':
        return this.INACTIVE;
      default:
        throw new Error(`Invalid membership status: ${status}`);
    }
  }
  
  /**
   * Get the status value
   * @returns {string} The membership status
   */
  get value() {
    return this._status;
  }
  
  /**
   * Check if the membership is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this === MembershipStatus.ACTIVE;
  }
  
  /**
   * Compare with another MembershipStatus
   * @param {MembershipStatus} other - Another MembershipStatus to compare with
   * @returns {boolean} True if both statuses have the same value
   */
  equals(other) {
    if (!(other instanceof MembershipStatus)) return false;
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
