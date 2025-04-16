/**
 * @interface Entity
 * Base interface for all entities in the domain
 * Entities are distinguished by their identity
 */
class Entity {
    /**
     * Returns the entity's unique identifier
     * @returns {string} The entity's ID
     */
    get id() {
      throw new Error('Method not implemented');
    }
    
    /**
     * Checks equality based on identity
     * @param {Entity} other - Another entity to compare with
     * @returns {boolean} True if both entities have the same identity
     */
    equals(other) {
      if (!other) return false;
      if (!(other instanceof Entity)) return false;
      return this.id === other.id;
    }
  }