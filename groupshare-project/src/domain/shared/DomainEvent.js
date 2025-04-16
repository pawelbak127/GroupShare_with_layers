/**
 * @interface DomainEvent
 * Base interface for all domain events
 */
class DomainEvent {
    constructor() {
      this._occurredOn = new Date();
    }
    
    /**
     * Get the timestamp when this event occurred
     * @returns {Date} The timestamp
     */
    get occurredOn() {
      return this._occurredOn;
    }
  }