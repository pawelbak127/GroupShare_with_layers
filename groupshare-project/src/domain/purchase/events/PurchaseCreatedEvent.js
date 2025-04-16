const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when a purchase is created
 * @extends DomainEvent
 */
class PurchaseCreatedEvent extends DomainEvent {
  /**
   * @param {Purchase} purchase - The created purchase
   */
  constructor(purchase) {
    super();
    this._purchaseId = purchase.id;
    this._userId = purchase.userId;
    this._subscriptionId = purchase.subscriptionId;
    this._status = purchase.status.toString();
  }
  
  /**
   * Get the purchase ID
   * @returns {string} The purchase ID
   */
  get purchaseId() {
    return this._purchaseId;
  }
  
  /**
   * Get the user ID
   * @returns {string} The user ID
   */
  get userId() {
    return this._userId;
  }
  
  /**
   * Get the subscription ID
   * @returns {string} The subscription ID
   */
  get subscriptionId() {
    return this._subscriptionId;
  }
  
  /**
   * Get the status
   * @returns {string} The status
   */
  get status() {
    return this._status;
  }
}