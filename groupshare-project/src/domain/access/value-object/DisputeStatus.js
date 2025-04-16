const { ValueObject } = require('../../shared/Entity');

/**
 * Status of a dispute
 * @extends ValueObject
 */
class DisputeStatus extends ValueObject {
  static OPEN = new DisputeStatus('open');
  static RESOLVED = new DisputeStatus('resolved');
  static CLOSED = new DisputeStatus('closed');
  
  /**
   * @param {string} status - The dispute status
   * @private
   */
  constructor(status) {
    super();
    this._status = status;
  }
  
  /**
   * Create a dispute status from string
   * @param {string} status - The dispute status string
   * @returns {DisputeStatus} A DisputeStatus instance
   * @throws {Error} If the status is invalid
   */
  static fromString(status) {
    switch (status.toLowerCase()) {
      case 'open':
        return this.OPEN;
      case 'resolved':
        return this.RESOLVED;
      case 'closed':
        return this.CLOSED;
      default:
        throw new Error(`Invalid dispute status: ${status}`);
    }
  }
  
  /**
   * Get the status value
   * @returns {string} The dispute status
   */
  get value() {
    return this._status;
  }
  
  /**
   * Check if the dispute is open
   * @returns {boolean} True if open
   */
  isOpen() {
    return this === DisputeStatus.OPEN;
  }
  
  /**
   * Check if the dispute is resolved
   * @returns {boolean} True if resolved
   */
  isResolved() {
    return this === DisputeStatus.RESOLVED;
  }
  
  /**
   * Compare with another DisputeStatus
   * @param {DisputeStatus} other - Another DisputeStatus to compare with
   * @returns {boolean} True if both statuses have the same value
   */
  equals(other) {
    if (!(other instanceof DisputeStatus)) return false;
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