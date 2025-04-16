/**
 * @interface Repository
 * @template T
 * Base interface for all repositories
 */
class Repository {
    /**
     * Find an entity by its ID
     * @param {string} id - The entity's ID
     * @returns {Promise<T|null>} The entity or null if not found
     */
    async findById(id) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Save an entity
     * @param {T} entity - The entity to save
     * @returns {Promise<void>}
     */
    async save(entity) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Delete an entity
     * @param {string} id - The entity's ID
     * @returns {Promise<void>}
     */
    async delete(id) {
      throw new Error('Method not implemented');
    }
  }
  
  // Export all shared interfaces
  module.exports = {
    Entity,
    AggregateRoot,
    ValueObject,
    DomainEvent,
    EventPublisher,
    Repository
  };