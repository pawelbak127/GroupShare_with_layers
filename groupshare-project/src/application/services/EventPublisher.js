// src/application/services/EventPublisher.js

/**
 * Serwis publikujący zdarzenia domenowe
 */
class EventPublisher {
    constructor() {
      this._handlers = new Map();
    }
    
    /**
     * Rejestruje handler dla typu zdarzenia
     * @param {string} eventType - Typ zdarzenia
     * @param {Function} handler - Funkcja obsługująca zdarzenie
     * @returns {void}
     */
    registerHandler(eventType, handler) {
      if (!this._handlers.has(eventType)) {
        this._handlers.set(eventType, []);
      }
      this._handlers.get(eventType).push(handler);
      
      console.log(`Registered handler for event type: ${eventType}`);
    }
    
    /**
     * Publikuje zdarzenie do wszystkich zarejestrowanych handlerów
     * @param {DomainEvent} event - Zdarzenie do opublikowania
     * @returns {Promise<void>}
     */
    async publish(event) {
      const eventType = event.constructor.name;
      console.log(`Publishing event: ${eventType}`);
      
      const handlers = this._handlers.get(eventType) || [];
      
      if (handlers.length === 0) {
        console.log(`No handlers registered for event type: ${eventType}`);
      } else {
        console.log(`Found ${handlers.length} handler(s) for event type: ${eventType}`);
      }
      
      const promises = handlers.map(handler => {
        try {
          return Promise.resolve(handler(event));
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
          return Promise.resolve(); // Aby nie przerwać łańcucha w przypadku błędu
        }
      });
      
      await Promise.all(promises);
    }
    
    /**
     * Publikuje wiele zdarzeń
     * @param {Array<DomainEvent>} events - Zdarzenia do opublikowania
     * @returns {Promise<void>}
     */
    async publishAll(events) {
      if (!events || events.length === 0) {
        return;
      }
      
      console.log(`Publishing ${events.length} events`);
      
      for (const event of events) {
        await this.publish(event);
      }
    }
  }
  
  module.exports = EventPublisher;