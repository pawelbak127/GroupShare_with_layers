/**
 * @interface AggregateRoot
 * @extends Entity
 * Base interface for all aggregate roots in the domain
 * Aggregates can collect and publish domain events
 */
class AggregateRoot extends Entity {
    constructor() {
      super();
      this._domainEvents = [];
    }
    
    /**
     * Get all collected domain events
     * @returns {Array<DomainEvent>} List of domain events
     */
    getDomainEvents() {
      return [...this._domainEvents];
    }
    
    /**
     * Add a new domain event
     * @param {DomainEvent} domainEvent - The event to add
     */
    addDomainEvent(domainEvent) {
      this._domainEvents.push(domainEvent);
    }
    
    /**
     * Clear all domain events
     */
    clearDomainEvents() {
      this._domainEvents = [];
    }
  }