const { ValueObject } = require('../../shared/Entity');
const crypto = require('crypto');

/**
 * Access token value object
 * @extends ValueObject
 */
class Token extends ValueObject {
  /**
   * @param {string} tokenValue - The token value
   * @param {string} tokenHash - The token hash
   * @private
   */
  constructor(tokenValue, tokenHash) {
    super();
    this._tokenValue = tokenValue;
    this._tokenHash = tokenHash;
  }
  
  /**
   * Generate a new random token
   * @param {string} [salt=''] - Salt for hashing
   * @returns {Token} A new Token instance
   */
  static generate(salt = '') {
    const tokenValue = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hash(tokenValue, salt);
    
    return new Token(tokenValue, tokenHash);
  }
  
  /**
   * Create a token from value with hashing
   * @param {string} tokenValue - The token value
   * @param {string} [salt=''] - Salt for hashing
   * @returns {Token} A Token instance
   */
  static fromValue(tokenValue, salt = '') {
    if (!tokenValue) {
      throw new Error('Token value cannot be empty');
    }
    
    const tokenHash = this.hash(tokenValue, salt);
    return new Token(tokenValue, tokenHash);
  }
  
  /**
   * Create a token from hash only (for database lookups)
   * @param {string} tokenHash - The token hash
   * @returns {Token} A Token instance
   */
  static fromHash(tokenHash) {
    if (!tokenHash) {
      throw new Error('Token hash cannot be empty');
    }
    
    return new Token(null, tokenHash);
  }
  
  /**
   * Hash a token value
   * @param {string} tokenValue - The token value
   * @param {string} [salt=''] - Salt for hashing
   * @returns {string} The token hash
   */
  static hash(tokenValue, salt = '') {
    return crypto
      .createHash('sha256')
      .update(tokenValue + salt)
      .digest('hex');
  }
  
  /**
   * Get the token value
   * @returns {string|null} The token value
   */
  get value() {
    return this._tokenValue;
  }
  
  /**
   * Get the token hash
   * @returns {string} The token hash
   */
  get hash() {
    return this._tokenHash;
  }
  
  /**
   * Compare with another Token instance
   * @param {Token} other - Another Token to compare with
   * @returns {boolean} True if both tokens have the same hash
   */
  equals(other) {
    if (!(other instanceof Token)) return false;
    return this._tokenHash === other.hash;
  }
}