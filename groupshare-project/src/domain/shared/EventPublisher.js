/**
 * Service for publishing domain events
 */
class EventPublisher {
    constructor() {
      this._handlers = new Map();
    }
    
    /**
     * Register an event handler for a specific event type
     * @param {string} eventType - Type of the event
     * @param {Function} handler - Handler function
     */
    registerHandler(eventType, handler) {
      if (!this._handlers.has(eventType)) {
        this._handlers.set(eventType, []);
      }
      this._handlers.get(eventType).push(handler);
    }
    
    /**
     * Publish an event to all registered handlers
     * @param {DomainEvent} event - The event to publish
     */
    async publish(event) {
      const eventType = event.constructor.name;
      const handlers = this._handlers.get(eventType) || [];
      
      for (const handler of handlers) {
        await handler(event);
      }
    }
    
    /**
     * Publish multiple events
     * @param {Array<DomainEvent>} events - The events to publish
     */
    async publishAll(events) {
      for (const event of events) {
        await this.publish(event);
      }
    }
  }