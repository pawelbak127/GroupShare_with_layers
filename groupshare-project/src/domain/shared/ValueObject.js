/**
 * @interface ValueObject
 * Base interface for all value objects in the domain
 * Value objects are immutable and equality is based on their properties
 */
class ValueObject {
    /**
     * Checks equality based on values
     * @param {ValueObject} other - Another value object to compare with
     * @returns {boolean} True if both value objects have the same values
     */
    equals(other) {
      if (!other) return false;
      if (!(other.constructor === this.constructor)) return false;
      
      // Implement value comparison in derived classes
      return false;
    }
  }