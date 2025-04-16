const { AggregateRoot } = require('../shared/Entity');
const { Id } = require('../shared/value-objects/Id');
const { ValidationException, BusinessRuleViolationException } = require('../shared/exceptions/DomainException');
const PurchaseStatus = require('./value-objects/PurchaseStatus');
const PurchaseCreatedEvent = require('./events/PurchaseCreatedEvent');
const PurchaseCompletedEvent = require('./events/PurchaseCompletedEvent');

/**
 * Purchase aggregate root
 * @extends AggregateRoot
 */
class Purchase extends AggregateRoot {
  /**
   * @param {Id} id - Purchase ID
   * @param {string} userId - User ID
   * @param {string} subscriptionId - Subscription ID
   * @param {PurchaseStatus} status - Purchase status
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {boolean} [accessProvided] - Whether access is provided
   * @param {Date|null} [accessProvidedAt] - Access provided timestamp
   * @param {boolean} [accessConfirmed] - Whether access is confirmed
   * @param {Date|null} [accessConfirmedAt] - Access confirmed timestamp
   * @param {Transaction|null} [transaction] - Associated transaction
   * @private
   */
  constructor(
    id,
    userId,
    subscriptionId,
    status,
    createdAt,
    updatedAt,
    accessProvided = false,
    accessProvidedAt = null,
    accessConfirmed = false,
    accessConfirmedAt = null,
    transaction = null
  ) {
    super();
    this._id = id;
    this._userId = userId;
    this._subscriptionId = subscriptionId;
    this._status = status;
    this._accessProvided = accessProvided;
    this._accessProvidedAt = accessProvidedAt;
    this._accessConfirmed = accessConfirmed;
    this._accessConfirmedAt = accessConfirmedAt;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._transaction = transaction;
  }
  
  /**
   * Create a new purchase
   * @param {Id} id - Purchase ID
   * @param {string} userId - User ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {Purchase} A new Purchase instance
   * @throws {ValidationException} If validation fails
   */
  static create(id, userId, subscriptionId) {
    // Validate input
    const errors = {};
    
    if (!userId) {
      errors.userId = 'User ID is required';
    }
    
    if (!subscriptionId) {
      errors.subscriptionId = 'Subscription ID is required';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid purchase data', errors);
    }
    
    const now = new Date();
    
    const purchase = new Purchase(
      id,
      userId,
      subscriptionId,
      PurchaseStatus.PENDING_PAYMENT,
      now,
      now
    );
    
    // Add domain event
    purchase.addDomainEvent(new PurchaseCreatedEvent(purchase));
    
    return purchase;
  }
  
  /**
   * Restore a purchase from persistence
   * @param {string} id - Purchase ID
   * @param {string} userId - User ID
   * @param {string} subscriptionId - Subscription ID
   * @param {string} status - Purchase status
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {boolean} accessProvided - Whether access is provided
   * @param {Date|null} accessProvidedAt - Access provided timestamp
   * @param {boolean} accessConfirmed - Whether access is confirmed
   * @param {Date|null} accessConfirmedAt - Access confirmed timestamp
   * @param {Object|null} transactionData - Transaction data
   * @returns {Purchase} A restored Purchase instance
   */
  static restore(
    id,
    userId,
    subscriptionId,
    status,
    createdAt,
    updatedAt,
    accessProvided = false,
    accessProvidedAt = null,
    accessConfirmed = false,
    accessConfirmedAt = null,
    transactionData = null
  ) {
    // Create transaction if data is provided
    let transaction = null;
    if (transactionData) {
      transaction = Transaction.restore(
        transactionData.id,
        transactionData.buyerId,
        transactionData.sellerId,
        transactionData.subscriptionId,
        transactionData.purchaseId,
        transactionData.amount,
        transactionData.platformFee,
        transactionData.sellerAmount,
        transactionData.currency,
        transactionData.paymentMethod,
        transactionData.paymentProvider,
        transactionData.paymentId,
        transactionData.status,
        transactionData.createdAt,
        transactionData.updatedAt,
        transactionData.completedAt
      );
    }
    
    return new Purchase(
      Id.from(id),
      userId,
      subscriptionId,
      PurchaseStatus.fromString(status),
      new Date(createdAt),
      new Date(updatedAt),
      accessProvided,
      accessProvidedAt ? new Date(accessProvidedAt) : null,
      accessConfirmed,
      accessConfirmedAt ? new Date(accessConfirmedAt) : null,
      transaction
    );
  }
  
  /**
   * Get the purchase ID
   * @returns {string} The purchase ID
   */
  get id() {
    return this._id.toString();
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
   * Get the purchase status
   * @returns {PurchaseStatus} The purchase status
   */
  get status() {
    return this._status;
  }
  
  /**
   * Check if access is provided
   * @returns {boolean} True if access is provided
   */
  get accessProvided() {
    return this._accessProvided;
  }
  
  /**
   * Get the access provided timestamp
   * @returns {Date|null} The access provided timestamp
   */
  get accessProvidedAt() {
    return this._accessProvidedAt ? new Date(this._accessProvidedAt) : null;
  }
  
  /**
   * Check if access is confirmed
   * @returns {boolean} True if access is confirmed
   */
  get accessConfirmed() {
    return this._accessConfirmed;
  }
  
  /**
   * Get the access confirmed timestamp
   * @returns {Date|null} The access confirmed timestamp
   */
  get accessConfirmedAt() {
    return this._accessConfirmedAt ? new Date(this._accessConfirmedAt) : null;
  }
  
  /**
   * Get the transaction
   * @returns {Transaction|null} The transaction
   */
  get transaction() {
    return this._transaction;
  }
  
  /**
   * Get the creation timestamp
   * @returns {Date} The creation timestamp
   */
  get createdAt() {
    return new Date(this._createdAt);
  }
  
  /**
   * Get the last update timestamp
   * @returns {Date} The last update timestamp
   */
  get updatedAt() {
    return new Date(this._updatedAt);
  }
  
  /**
   * Add a transaction to the purchase
   * @param {Transaction} transaction - The transaction
   * @returns {void}
   * @throws {BusinessRuleViolationException} If a transaction is already added
   */
  addTransaction(transaction) {
    if (this._transaction) {
      throw new BusinessRuleViolationException(
        'Purchase already has a transaction',
        'transaction_exists'
      );
    }
    
    this._transaction = transaction;
    this._updatedAt = new Date();
  }
  
  /**
   * Complete the purchase
   * @returns {void}
   * @throws {BusinessRuleViolationException} If the purchase is not pending payment
   */
  complete() {
    if (!this._status.isPendingPayment()) {
      throw new BusinessRuleViolationException(
        'Only pending purchases can be completed',
        'invalid_status_transition'
      );
    }
    
    this._status = PurchaseStatus.COMPLETED;
    this._accessProvided = true;
    this._accessProvidedAt = new Date();
    this._updatedAt = new Date();
    
    // Add domain event
    this.addDomainEvent(new PurchaseCompletedEvent(this, this._transaction));
  }
  
  /**
   * Cancel the purchase
   * @returns {void}
   * @throws {BusinessRuleViolationException} If the purchase is already completed
   */
  cancel() {
    if (this._status.isCompleted()) {
      throw new BusinessRuleViolationException(
        'Completed purchases cannot be cancelled',
        'invalid_status_transition'
      );
    }
    
    this._status = PurchaseStatus.CANCELLED;
    this._updatedAt = new Date();
  }
  
  /**
   * Mark the purchase as having a problem
   * @returns {void}
   */
  markAsProblem() {
    this._status = PurchaseStatus.PROBLEM;
    this._updatedAt = new Date();
  }
  
  /**
   * Mark access as confirmed
   * @returns {void}
   * @throws {BusinessRuleViolationException} If access is not provided
   */
  confirmAccess() {
    if (!this._accessProvided) {
      throw new BusinessRuleViolationException(
        'Access must be provided before it can be confirmed',
        'access_not_provided'
      );
    }
    
    this._accessConfirmed = true;
    this._accessConfirmedAt = new Date();
    this._updatedAt = new Date();
  }
  
  /**
   * Check if the purchase is pending payment
   * @returns {boolean} True if pending payment
   */
  isPendingPayment() {
    return this._status.isPendingPayment();
  }
  
  /**
   * Check if the purchase is completed
   * @returns {boolean} True if completed
   */
  isCompleted() {
    return this._status.isCompleted();
  }
  
  /**
   * Check if the purchase has a confirmed transaction
   * @returns {boolean} True if transaction is confirmed
   */
  hasConfirmedTransaction() {
    return this._transaction !== null && this._transaction.status.isCompleted();
  }
}