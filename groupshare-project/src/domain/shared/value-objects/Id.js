const { ValueObject } = require('../Entity');
const { v4: uuidv4 } = require('uuid');

/**
 * Represents an identifier in the domain
 * @extends ValueObject
 */
class Id extends ValueObject {
  /**
   * @param {string} value - The ID value
   * @private
   */
  constructor(value) {
    super();
    this._value = value;
  }
  
  /**
   * Create a new random ID
   * @returns {Id} A new ID instance
   */
  static create() {
    return new Id(uuidv4());
  }
  
  /**
   * Create an ID from an existing value
   * @param {string} id - Existing ID value
   * @returns {Id} An ID instance with the given value
   */
  static from(id) {
    if (!id) throw new Error('ID cannot be empty');
    return new Id(id);
  }
  
  /**
   * Get the string value of the ID
   * @returns {string} The ID value
   */
  get value() {
    return this._value;
  }
  
  /**
   * Convert the ID to string
   * @returns {string} String representation
   */
  toString() {
    return this._value;
  }
  
  /**
   * Compare with another ID
   * @param {Id} other - Another ID to compare with
   * @returns {boolean} True if both IDs have the same value
   */
  equals(other) {
    if (!(other instanceof Id)) return false;
    return this._value === other.value;
  }
}