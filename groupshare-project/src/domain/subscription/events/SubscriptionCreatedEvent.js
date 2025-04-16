const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when a subscription is created
 * @extends DomainEvent
 */
class SubscriptionCreatedEvent extends DomainEvent {
  /**
   * @param {Subscription} subscription - The created subscription
   */
  constructor(subscription) {
    super();
    this._subscriptionId = subscription.id;
    this._groupId = subscription.groupId;
    this._platformId = subscription.platformId;
    this._pricePerSlot = subscription.pricePerSlot.toString();
    this._slotsTotal = subscription.slotsTotal;
  }
  
  /**
   * Get the subscription ID
   * @returns {string} The subscription ID
   */
  get subscriptionId() {
    return this._subscriptionId;
  }
  
  /**
   * Get the group ID
   * @returns {string} The group ID
   */
  get groupId() {
    return this._groupId;
  }
  
  /**
   * Get the platform ID
   * @returns {string} The platform ID
   */
  get platformId() {
    return this._platformId;
  }
  
  /**
   * Get the price per slot
   * @returns {string} The price per slot
   */
  get pricePerSlot() {
    return this._pricePerSlot;
  }
  
  /**
   * Get the total number of slots
   * @returns {number} The total number of slots
   */
  get slotsTotal() {
    return this._slotsTotal;
  }
}