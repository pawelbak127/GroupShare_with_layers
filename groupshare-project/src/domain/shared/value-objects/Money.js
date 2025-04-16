// src/domain/shared/value-objects/Money.js
const { ValueObject } = require('../Entity');

/**
 * Represents a monetary amount with currency
 * @extends ValueObject
 */
class Money extends ValueObject {
  /**
   * @param {number} amount - The monetary amount
   * @param {string} currency - The currency code (e.g., "PLN", "USD")
   * @private
   */
  constructor(amount, currency) {
    super();
    this._amount = parseFloat(amount);
    this._currency = currency;
    
    if (isNaN(this._amount)) {
      throw new Error('Amount must be a number');
    }
    
    // Round to 2 decimal places for financial values
    this._amount = Math.round(this._amount * 100) / 100;
  }
  
  /**
   * Create a new Money instance
   * @param {number} amount - The monetary amount
   * @param {string} currency - The currency code
   * @returns {Money} A new Money instance
   */
  static create(amount, currency = 'PLN') {
    return new Money(amount, currency);
  }
  
  /**
   * Create a Money instance with zero amount
   * @param {string} currency - The currency code
   * @returns {Money} A Money instance with zero amount
   */
  static zero(currency = 'PLN') {
    return new Money(0, currency);
  }
  
  /**
   * Get the amount
   * @returns {number} The monetary amount
   */
  get amount() {
    return this._amount;
  }
  
  /**
   * Get the currency
   * @returns {string} The currency code
   */
  get currency() {
    return this._currency;
  }
  
  /**
   * Add another Money instance
   * @param {Money} money - The Money to add
   * @returns {Money} A new Money instance with the sum
   * @throws {Error} If currencies don't match
   */
  add(money) {
    if (this._currency !== money.currency) {
      throw new Error(`Cannot add money with different currencies: ${this._currency} and ${money.currency}`);
    }
    
    return new Money(this._amount + money.amount, this._currency);
  }
  
  /**
   * Subtract another Money instance
   * @param {Money} money - The Money to subtract
   * @returns {Money} A new Money instance with the difference
   * @throws {Error} If currencies don't match
   */
  subtract(money) {
    if (this._currency !== money.currency) {
      throw new Error(`Cannot subtract money with different currencies: ${this._currency} and ${money.currency}`);
    }
    
    return new Money(this._amount - money.amount, this._currency);
  }
  
  /**
   * Multiply by a factor
   * @param {number} multiplier - The multiplication factor
   * @returns {Money} A new Money instance with the product
   */
  multiply(multiplier) {
    return new Money(this._amount * multiplier, this._currency);
  }
  
  /**
   * Check if this Money is greater than another
   * @param {Money} money - The Money to compare with
   * @returns {boolean} True if this Money is greater
   * @throws {Error} If currencies don't match
   */
  greaterThan(money) {
    if (this._currency !== money.currency) {
      throw new Error(`Cannot compare money with different currencies: ${this._currency} and ${money.currency}`);
    }
    
    return this._amount > money.amount;
  }
  
  /**
   * Check if this Money is less than another
   * @param {Money} money - The Money to compare with
   * @returns {boolean} True if this Money is less
   * @throws {Error} If currencies don't match
   */
  lessThan(money) {
    if (this._currency !== money.currency) {
      throw new Error(`Cannot compare money with different currencies: ${this._currency} and ${money.currency}`);
    }
    
    return this._amount < money.amount;
  }
  
  /**
   * Convert to string representation
   * @returns {string} String representation with amount and currency
   */
  toString() {
    return `${this._amount.toFixed(2)} ${this._currency}`;
  }
  
  /**
   * Compare with another Money instance
   * @param {Money} other - Another Money to compare with
   * @returns {boolean} True if both Money instances have the same amount and currency
   */
  equals(other) {
    if (!(other instanceof Money)) return false;
    return this._amount === other.amount && this._currency === other.currency;
  }
}