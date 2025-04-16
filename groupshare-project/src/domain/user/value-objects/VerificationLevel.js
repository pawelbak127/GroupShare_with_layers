const { ValueObject } = require('../../shared/Entity');

/**
 * Verification level of a user
 * @extends ValueObject
 */
class VerificationLevel extends ValueObject {
  static BASIC = new VerificationLevel('basic');
  static VERIFIED = new VerificationLevel('verified');
  
  /**
   * @param {string} level - The verification level
   * @private
   */
  constructor(level) {
    super();
    this._level = level;
  }
  
  /**
   * Create a verification level from string
   * @param {string} level - The verification level string
   * @returns {VerificationLevel} A VerificationLevel instance
   * @throws {Error} If the level is invalid
   */
  static fromString(level) {
    switch (level.toLowerCase()) {
      case 'basic':
        return this.BASIC;
      case 'verified':
        return this.VERIFIED;
      default:
        throw new Error(`Invalid verification level: ${level}`);
    }
  }
  
  /**
   * Get the level value
   * @returns {string} The verification level
   */
  get value() {
    return this._level;
  }
  
  /**
   * Check if this is a verified level
   * @returns {boolean} True if verified
   */
  isVerified() {
    return this === VerificationLevel.VERIFIED;
  }
  
  /**
   * Compare with another VerificationLevel
   * @param {VerificationLevel} other - Another VerificationLevel to compare with
   * @returns {boolean} True if both levels have the same value
   */
  equals(other) {
    if (!(other instanceof VerificationLevel)) return false;
    return this._level === other.value;
  }
  
  /**
   * Convert to string
   * @returns {string} String representation
   */
  toString() {
    return this._level;
  }
}