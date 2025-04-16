const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when subscription slots are purchased
 * @extends DomainEvent
 */
class SlotsPurchasedEvent extends DomainEvent {
  /**
   * @param {Subscription} subscription - The subscription
   * @param {number} slotsPurchased - Number of slots purchased
   * @param {string} purchaserId - ID of the purchaser
   */
  constructor(subscription, slotsPurchased, purchaserId) {
    super();
    this._subscriptionId = subscription.id;
    this._groupId = subscription.groupId;
    this._slotsPurchased = slotsPurchased;
    this._slotsRemaining = subscription.slotsAvailable;
    this._purchaserId = purchaserId;
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
   * Get the number of slots purchased
   * @returns {number} The number of slots purchased
   */
  get slotsPurchased() {
    return this._slotsPurchased;
  }
  
  /**
   * Get the number of slots remaining
   * @returns {number} The number of slots remaining
   */
  get slotsRemaining() {
    return this._slotsRemaining;
  }
  
  /**
   * Get the purchaser ID
   * @returns {string} The purchaser ID
   */
  get purchaserId() {
    return this._purchaserId;
  }
}