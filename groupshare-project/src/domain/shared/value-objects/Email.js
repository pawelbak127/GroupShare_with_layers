const { ValueObject } = require('../Entity');

/**
 * Represents an email address
 * @extends ValueObject
 */
class Email extends ValueObject {
  /**
   * @param {string} value - The email address
   * @private
   */
  constructor(value) {
    super();
    this._value = value;
  }
  
  /**
   * Create a new Email instance after validation
   * @param {string} email - The email address
   * @returns {Email} A new Email instance
   * @throws {Error} If the email is invalid
   */
  static create(email) {
    if (!email) {
      throw new Error('Email cannot be empty');
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Email "${email}" is invalid`);
    }
    
    return new Email(email);
  }
  
  /**
   * Get the email value
   * @returns {string} The email address
   */
  get value() {
    return this._value;
  }
  
  /**
   * Convert to string
   * @returns {string} The email address
   */
  toString() {
    return this._value;
  }
  
  /**
   * Compare with another Email instance
   * @param {Email} other - Another Email to compare with
   * @returns {boolean} True if both Email instances have the same value
   */
  equals(other) {
    if (!(other instanceof Email)) return false;
    return this._value === other.value;
  }
}

// Export all value objects
module.exports = {
  Id,
  Money,
  Email
};