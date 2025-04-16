const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when a purchase is completed
 * @extends DomainEvent
 */
class PurchaseCompletedEvent extends DomainEvent {
  /**
   * @param {Purchase} purchase - The completed purchase
   * @param {Transaction} transaction - The transaction
   */
  constructor(purchase, transaction) {
    super();
    this._purchaseId = purchase.id;
    this._userId = purchase.userId;
    this._subscriptionId = purchase.subscriptionId;
    this._transactionId = transaction?.id;
    this._accessProvided = purchase.accessProvided;
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
   * Get the transaction ID
   * @returns {string|undefined} The transaction ID
   */
  get transactionId() {
    return this._transactionId;
  }
  
  /**
   * Check if access is provided
   * @returns {boolean} True if access is provided
   */
  get accessProvided() {
    return this._accessProvided;
  }
}