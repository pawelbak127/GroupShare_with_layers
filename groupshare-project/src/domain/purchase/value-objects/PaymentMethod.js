const { ValueObject } = require('../../shared/Entity');

/**
 * Payment method for a transaction
 * @extends ValueObject
 */
class PaymentMethod extends ValueObject {
  static BLIK = new PaymentMethod('blik');
  static CARD = new PaymentMethod('card');
  static TRANSFER = new PaymentMethod('transfer');
  
  /**
   * @param {string} method - The payment method
   * @private
   */
  constructor(method) {
    super();
    this._method = method;
  }
  
  /**
   * Create a payment method from string
   * @param {string} method - The payment method string
   * @returns {PaymentMethod} A PaymentMethod instance
   * @throws {Error} If the method is invalid
   */
  static fromString(method) {
    switch (method.toLowerCase()) {
      case 'blik':
        return this.BLIK;
      case 'card':
        return this.CARD;
      case 'transfer':
        return this.TRANSFER;
      default:
        throw new Error(`Invalid payment method: ${method}`);
    }
  }
  
  /**
   * Get the method value
   * @returns {string} The payment method
   */
  get value() {
    return this._method;
  }
  
  /**
   * Compare with another PaymentMethod
   * @param {PaymentMethod} other - Another PaymentMethod to compare with
   * @returns {boolean} True if both methods have the same value
   */
  equals(other) {
    if (!(other instanceof PaymentMethod)) return false;
    return this._method === other.value;
  }
  
  /**
   * Convert to string
   * @returns {string} String representation
   */
  toString() {
    return this._method;
  }
}