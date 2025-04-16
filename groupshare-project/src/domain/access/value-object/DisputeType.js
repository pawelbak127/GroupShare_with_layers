const { ValueObject } = require('../../shared/Entity');

/**
 * Type of a dispute
 * @extends ValueObject
 */
class DisputeType extends ValueObject {
  static ACCESS = new DisputeType('access');
  static QUALITY = new DisputeType('quality');
  
  /**
   * @param {string} type - The dispute type
   * @private
   */
  constructor(type) {
    super();
    this._type = type;
  }
  
  /**
   * Create a dispute type from string
   * @param {string} type - The dispute type string
   * @returns {DisputeType} A DisputeType instance
   * @throws {Error} If the type is invalid
   */
  static fromString(type) {
    switch (type.toLowerCase()) {
      case 'access':
        return this.ACCESS;
      case 'quality':
        return this.QUALITY;
      default:
        throw new Error(`Invalid dispute type: ${type}`);
    }
  }
  
  /**
   * Get the type value
   * @returns {string} The dispute type
   */
  get value() {
    return this._type;
  }
  
  /**
   * Check if this is an access dispute
   * @returns {boolean} True if access dispute
   */
  isAccessDispute() {
    return this === DisputeType.ACCESS;
  }
  
  /**
   * Compare with another DisputeType
   * @param {DisputeType} other - Another DisputeType to compare with
   * @returns {boolean} True if both types have the same value
   */
  equals(other) {
    if (!(other instanceof DisputeType)) return false;
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