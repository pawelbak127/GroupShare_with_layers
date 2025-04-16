const { ValueObject } = require('../../shared/Entity');

/**
 * Profile type of a user
 * @extends ValueObject
 */
class ProfileType extends ValueObject {
  static BUYER = new ProfileType('buyer');
  static SELLER = new ProfileType('seller');
  static BOTH = new ProfileType('both');
  
  /**
   * @param {string} type - The profile type
   * @private
   */
  constructor(type) {
    super();
    this._type = type;
  }
  
  /**
   * Create a profile type from string
   * @param {string} type - The profile type string
   * @returns {ProfileType} A ProfileType instance
   * @throws {Error} If the type is invalid
   */
  static fromString(type) {
    switch (type.toLowerCase()) {
      case 'buyer':
        return this.BUYER;
      case 'seller':
        return this.SELLER;
      case 'both':
        return this.BOTH;
      default:
        throw new Error(`Invalid profile type: ${type}`);
    }
  }
  
  /**
   * Get the type value
   * @returns {string} The profile type
   */
  get value() {
    return this._type;
  }
  
  /**
   * Check if this profile can buy
   * @returns {boolean} True if can buy
   */
  canBuy() {
    return this === ProfileType.BUYER || this === ProfileType.BOTH;
  }
  
  /**
   * Check if this profile can sell
   * @returns {boolean} True if can sell
   */
  canSell() {
    return this === ProfileType.SELLER || this === ProfileType.BOTH;
  }
  
  /**
   * Compare with another ProfileType
   * @param {ProfileType} other - Another ProfileType to compare with
   * @returns {boolean} True if both types have the same value
   */
  equals(other) {
    if (!(other instanceof ProfileType)) return false;
    return this._type === other.value;
  }
  
  /**
   * Convert to string
   * @returns {string} String representation
   */
  toString() {
    return this._type;
  }
}