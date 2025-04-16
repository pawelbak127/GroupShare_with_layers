const { Entity } = require('../../shared/Entity');
const { Id } = require('../../shared/value-objects/Id');
const { Money } = require('../../shared/value-objects/Money');
const { ValidationException } = require('../../shared/exceptions/DomainException');
const TransactionStatus = require('../value-objects/TransactionStatus');
const PaymentMethod = require('../value-objects/PaymentMethod');

/**
 * Transaction entity
 * @extends Entity
 */
class Transaction extends Entity {
  /**
   * @param {Id} id - Transaction ID
   * @param {string} buyerId - Buyer user ID
   * @param {string} sellerId - Seller user ID
   * @param {string} subscriptionId - Subscription ID
   * @param {string} purchaseId - Purchase ID
   * @param {Money} amount - Transaction amount
   * @param {Money} platformFee - Platform fee
   * @param {Money} sellerAmount - Seller amount
   * @param {PaymentMethod} paymentMethod - Payment method
   * @param {TransactionStatus} status - Transaction status
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {string} [paymentProvider] - Payment provider
   * @param {string} [paymentId] - Payment ID
   * @param {Date|null} [completedAt] - Completion timestamp
   * @private
   */
  constructor(
    id,
    buyerId,
    sellerId,
    subscriptionId,
    purchaseId,
    amount,
    platformFee,
    sellerAmount,
    paymentMethod,
    status,
    createdAt,
    updatedAt,
    paymentProvider = 'stripe',
    paymentId = null,
    completedAt = null
  ) {
    super();
    this._id = id;
    this._buyerId = buyerId;
    this._sellerId = sellerId;
    this._subscriptionId = subscriptionId;
    this._purchaseId = purchaseId;
    this._amount = amount;
    this._platformFee = platformFee;
    this._sellerAmount = sellerAmount;
    this._paymentMethod = paymentMethod;
    this._status = status;
    this._paymentProvider = paymentProvider;
    this._paymentId = paymentId;
    this._completedAt = completedAt;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }
  
  /**
   * Create a new transaction
   * @param {Id} id - Transaction ID
   * @param {string} buyerId - Buyer user ID
   * @param {string} sellerId - Seller user ID
   * @param {string} subscriptionId - Subscription ID
   * @param {string} purchaseId - Purchase ID
   * @param {number} amount - Transaction amount
   * @param {string} currency - Currency code
   * @param {string} paymentMethod - Payment method
   * @param {number} platformFeePercent - Platform fee percentage
   * @returns {Transaction} A new Transaction instance
   * @throws {ValidationException} If validation fails
   */
  static create(
    id,
    buyerId,
    sellerId,
    subscriptionId,
    purchaseId,
    amount,
    currency,
    paymentMethod,
    platformFeePercent = 0.05
  ) {
    // Validate input
    const errors = {};
    
    if (!buyerId) {
      errors.buyerId = 'Buyer ID is required';
    }
    
    if (!sellerId) {
      errors.sellerId = 'Seller ID is required';
    }
    
    if (!subscriptionId) {
      errors.subscriptionId = 'Subscription ID is required';
    }
    
    if (!purchaseId) {
      errors.purchaseId = 'Purchase ID is required';
    }
    
    if (!amount || amount <= 0) {
      errors.amount = 'Amount must be greater than zero';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid transaction data', errors);
    }
    
    const amountMoney = Money.create(amount, currency);
    const platformFee = amountMoney.multiply(platformFeePercent);
    const sellerAmount = amountMoney.subtract(platformFee);
    
    const now = new Date();
    
    return new Transaction(
      id,
      buyerId,
      sellerId,
      subscriptionId,
      purchaseId,
      amountMoney,
      platformFee,
      sellerAmount,
      PaymentMethod.fromString(paymentMethod),
      TransactionStatus.PENDING,
      now,
      now
    );
  }
  
  /**
   * Restore a transaction from persistence
   * @param {string} id - Transaction ID
   * @param {string} buyerId - Buyer user ID
   * @param {string} sellerId - Seller user ID
   * @param {string} subscriptionId - Subscription ID
   * @param {string} purchaseId - Purchase ID
   * @param {number} amount - Transaction amount
   * @param {number} platformFee - Platform fee
   * @param {number} sellerAmount - Seller amount
   * @param {string} currency - Currency code
   * @param {string} paymentMethod - Payment method
   * @param {string} paymentProvider - Payment provider
   * @param {string} paymentId - Payment ID
   * @param {string} status - Transaction status
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {Date|null} completedAt - Completion timestamp
   * @returns {Transaction} A restored Transaction instance
   */
  static restore(
    id,
    buyerId,
    sellerId,
    subscriptionId,
    purchaseId,
    amount,
    platformFee,
    sellerAmount,
    currency,
    paymentMethod,
    paymentProvider,
    paymentId,
    status,
    createdAt,
    updatedAt,
    completedAt = null
  ) {
    return new Transaction(
      Id.from(id),
      buyerId,
      sellerId,
      subscriptionId,
      purchaseId,
      Money.create(amount, currency),
      Money.create(platformFee, currency),
      Money.create(sellerAmount, currency),
      PaymentMethod.fromString(paymentMethod),
      TransactionStatus.fromString(status),
      new Date(createdAt),
      new Date(updatedAt),
      paymentProvider,
      paymentId,
      completedAt ? new Date(completedAt) : null
    );
  }
  
  /**
   * Get the transaction ID
   * @returns {string} The transaction ID
   */
  get id() {
    return this._id.toString();
  }
  
  /**
   * Get the buyer user ID
   * @returns {string} The buyer user ID
   */
  get buyerId() {
    return this._buyerId;
  }
  
  /**
   * Get the seller user ID
   * @returns {string} The seller user ID
   */
  get sellerId() {
    return this._sellerId;
  }
  
  /**
   * Get the subscription ID
   * @returns {string} The subscription ID
   */
  get subscriptionId() {
    return this._subscriptionId;
  }
  
  /**
   * Get the purchase ID
   * @returns {string} The purchase ID
   */
  get purchaseId() {
    return this._purchaseId;
  }
  
  /**
   * Get the transaction amount
   * @returns {Money} The transaction amount
   */
  get amount() {
    return this._amount;
  }
  
  /**
   * Get the platform fee
   * @returns {Money} The platform fee
   */
  get platformFee() {
    return this._platformFee;
  }
  
  /**
   * Get the seller amount
   * @returns {Money} The seller amount
   */
  get sellerAmount() {
    return this._sellerAmount;
  }
  
  /**
   * Get the payment method
   * @returns {PaymentMethod} The payment method
   */
  get paymentMethod() {
    return this._paymentMethod;
  }
  
  /**
   * Get the transaction status
   * @returns {TransactionStatus} The transaction status
   */
  get status() {
    return this._status;
  }
  
  /**
   * Get the payment provider
   * @returns {string} The payment provider
   */
  get paymentProvider() {
    return this._paymentProvider;
  }
  
  /**
   * Get the payment ID
   * @returns {string|null} The payment ID
   */
  get paymentId() {
    return this._paymentId;
  }
  
  /**
   * Get the completion timestamp
   * @returns {Date|null} The completion timestamp
   */
  get completedAt() {
    return this._completedAt ? new Date(this._completedAt) : null;
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
   * Mark the transaction as completed
   * @param {string} paymentId - Payment ID
   * @returns {void}
   */
  complete(paymentId) {
    if (this._status.isCompleted()) {
      return; // Already completed
    }
    
    this._status = TransactionStatus.COMPLETED;
    this._paymentId = paymentId;
    this._completedAt = new Date();
    this._updatedAt = new Date();
  }
  
  /**
   * Mark the transaction as failed
   * @returns {void}
   */
  fail() {
    this._status = TransactionStatus.FAILED;
    this._updatedAt = new Date();
  }
  
  /**
   * Mark the transaction as refunded
   * @returns {void}
   */
  refund() {
    this._status = TransactionStatus.REFUNDED;
    this._updatedAt = new Date();
  }
  
  /**
   * Check if the transaction amounts are valid
   * @returns {boolean} True if valid
   */
  validateAmounts() {
    // Calculate the sum of platform fee and seller amount
    const sum = this._platformFee.add(this._sellerAmount);
    
    // Compare with the total amount
    return this._amount.equals(sum);
  }
  
  /**
   * Verify payment details
   * @param {string} paymentProvider - Payment provider
   * @param {string} paymentId - Payment ID
   * @returns {boolean} True if verified
   */
  verifyPayment(paymentProvider, paymentId) {
    return paymentProvider === this._paymentProvider && paymentId === this._paymentId;
  }
}