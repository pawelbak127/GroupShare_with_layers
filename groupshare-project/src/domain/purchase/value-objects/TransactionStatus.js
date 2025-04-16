const { ValueObject } = require('../../shared/Entity');

/**
 * Status of a transaction
 * @extends ValueObject
 */
class TransactionStatus extends ValueObject {
  static PENDING = new TransactionStatus('pending');
  static COMPLETED = new TransactionStatus('completed');
  static FAILED = new TransactionStatus('failed');
  static REFUNDED = new TransactionStatus('refunded');
  
  /**
   * @param {string} status - The transaction status
   * @private
   */
  constructor(status) {
    super();
    this._status = status;
  }
  
  /**
   * Create a transaction status from string
   * @param {string} status - The transaction status string
   * @returns {TransactionStatus} A TransactionStatus instance
   * @throws {Error} If the status is invalid
   */
  static fromString(status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return this.PENDING;
      case 'completed':
        return this.COMPLETED;
      case 'failed':
        return this.FAILED;
      case 'refunded':
        return this.REFUNDED;
      default:
        throw new Error(`Invalid transaction status: ${status}`);
    }
  }
  
  /**
   * Get the status value
   * @returns {string} The transaction status
   */
  get value() {
    return this._status;
  }
  
  /**
   * Check if the transaction is completed
   * @returns {boolean} True if completed
   */
  isCompleted() {
    return this === TransactionStatus.COMPLETED;
  }
  
  /**
   * Check if the transaction is refunded
   * @returns {boolean} True if refunded
   */
  isRefunded() {
    return this === TransactionStatus.REFUNDED;
  }
  
  /**
   * Compare with another TransactionStatus
   * @param {TransactionStatus} other - Another TransactionStatus to compare with
   * @returns {boolean} True if both statuses have the same value
   */
  equals(other) {
    if (!(other instanceof TransactionStatus)) return false;
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