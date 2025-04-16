const { ValueObject } = require('../../shared/Entity');

/**
 * Status of a purchase
 * @extends ValueObject
 */
class PurchaseStatus extends ValueObject {
  static PENDING_PAYMENT = new PurchaseStatus('pending_payment');
  static COMPLETED = new PurchaseStatus('completed');
  static CANCELLED = new PurchaseStatus('cancelled');
  static PROBLEM = new PurchaseStatus('problem');
  
  /**
   * @param {string} status - The purchase status
   * @private
   */
  constructor(status) {
    super();
    this._status = status;
  }
  
  /**
   * Create a purchase status from string
   * @param {string} status - The purchase status string
   * @returns {PurchaseStatus} A PurchaseStatus instance
   * @throws {Error} If the status is invalid
   */
  static fromString(status) {
    switch (status.toLowerCase()) {
      case 'pending_payment':
        return this.PENDING_PAYMENT;
      case 'completed':
        return this.COMPLETED;
      case 'cancelled':
        return this.CANCELLED;
      case 'problem':
        return this.PROBLEM;
      default:
        throw new Error(`Invalid purchase status: ${status}`);
    }
  }
  
  /**
   * Get the status value
   * @returns {string} The purchase status
   */
  get value() {
    return this._status;
  }
  
  /**
   * Check if the purchase is pending payment
   * @returns {boolean} True if pending payment
   */
  isPendingPayment() {
    return this === PurchaseStatus.PENDING_PAYMENT;
  }
  
  /**
   * Check if the purchase is completed
   * @returns {boolean} True if completed
   */
  isCompleted() {
    return this === PurchaseStatus.COMPLETED;
  }
  
  /**
   * Compare with another PurchaseStatus
   * @param {PurchaseStatus} other - Another PurchaseStatus to compare with
   * @returns {boolean} True if both statuses have the same value
   */
  equals(other) {
    if (!(other instanceof PurchaseStatus)) return false;
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