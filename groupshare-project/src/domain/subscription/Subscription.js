const { AggregateRoot } = require('../shared/Entity');
const { Id } = require('../shared/value-objects/Id');
const { Money } = require('../shared/value-objects/Money');
const { ValidationException, BusinessRuleViolationException } = require('../shared/exceptions/DomainException');
const SubscriptionStatus = require('./value-objects/SubscriptionStatus');
const AccessInstructions = require('./value-objects/AccessInstructions');
const SubscriptionCreatedEvent = require('./events/SubscriptionCreatedEvent');
const SlotsPurchasedEvent = require('./events/SlotsPurchasedEvent');

/**
 * Subscription aggregate root
 * @extends AggregateRoot
 */
class Subscription extends AggregateRoot {
  /**
   * @param {Id} id - Subscription ID
   * @param {string} groupId - Group ID
   * @param {string} platformId - Platform ID
   * @param {SubscriptionStatus} status - Subscription status
   * @param {number} slotsTotal - Total number of slots
   * @param {number} slotsAvailable - Number of available slots
   * @param {Money} pricePerSlot - Price per slot
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {AccessInstructions} [accessInstructions] - Access instructions
   * @private
   */
  constructor(
    id,
    groupId,
    platformId,
    status,
    slotsTotal,
    slotsAvailable,
    pricePerSlot,
    createdAt,
    updatedAt,
    accessInstructions = null
  ) {
    super();
    this._id = id;
    this._groupId = groupId;
    this._platformId = platformId;
    this._status = status;
    this._slotsTotal = slotsTotal;
    this._slotsAvailable = slotsAvailable;
    this._pricePerSlot = pricePerSlot;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._accessInstructions = accessInstructions;
  }
  
  /**
   * Create a new subscription
   * @param {Id} id - Subscription ID
   * @param {string} groupId - Group ID
   * @param {string} platformId - Platform ID
   * @param {number} slotsTotal - Total number of slots
   * @param {number} pricePerSlot - Price per slot
   * @param {string} currency - Currency code
   * @returns {Subscription} A new Subscription instance
   * @throws {ValidationException} If validation fails
   */
  static create(id, groupId, platformId, slotsTotal, pricePerSlot, currency = 'PLN') {
    // Validate input
    const errors = {};
    
    if (!groupId) {
      errors.groupId = 'Group ID is required';
    }
    
    if (!platformId) {
      errors.platformId = 'Platform ID is required';
    }
    
    if (!slotsTotal || slotsTotal <= 0) {
      errors.slotsTotal = 'Total slots must be greater than zero';
    }
    
    if (!pricePerSlot || pricePerSlot <= 0) {
      errors.pricePerSlot = 'Price per slot must be greater than zero';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid subscription data', errors);
    }
    
    const now = new Date();
    
    const subscription = new Subscription(
      id,
      groupId,
      platformId,
      SubscriptionStatus.ACTIVE,
      slotsTotal,
      slotsTotal, // Initially, all slots are available
      Money.create(pricePerSlot, currency),
      now,
      now
    );
    
    // Add domain event
    subscription.addDomainEvent(new SubscriptionCreatedEvent(subscription));
    
    return subscription;
  }
  
  /**
   * Restore a subscription from persistence
   * @param {string} id - Subscription ID
   * @param {string} groupId - Group ID
   * @param {string} platformId - Platform ID
   * @param {string} status - Subscription status
   * @param {number} slotsTotal - Total number of slots
   * @param {number} slotsAvailable - Number of available slots
   * @param {number} pricePerSlot - Price per slot
   * @param {string} currency - Currency code
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {Object} [accessInstructionsData] - Access instructions data
   * @returns {Subscription} A restored Subscription instance
   */
  static restore(
    id,
    groupId,
    platformId,
    status,
    slotsTotal,
    slotsAvailable,
    pricePerSlot,
    currency,
    createdAt,
    updatedAt,
    accessInstructionsData = null
  ) {
    // Create access instructions if data is provided
    let accessInstructions = null;
    if (accessInstructionsData) {
      accessInstructions = AccessInstructions.fromEncrypted(
        accessInstructionsData.encryptedData,
        accessInstructionsData.encryptionKeyId,
        accessInstructionsData.iv,
        accessInstructionsData.encryptionVersion
      );
    }
    
    return new Subscription(
      Id.from(id),
      groupId,
      platformId,
      SubscriptionStatus.fromString(status),
      slotsTotal,
      slotsAvailable,
      Money.create(pricePerSlot, currency),
      new Date(createdAt),
      new Date(updatedAt),
      accessInstructions
    );
  }
  
  /**
   * Get the subscription ID
   * @returns {string} The subscription ID
   */
  get id() {
    return this._id.toString();
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
   * Get the subscription status
   * @returns {SubscriptionStatus} The subscription status
   */
  get status() {
    return this._status;
  }
  
  /**
   * Get the total number of slots
   * @returns {number} The total number of slots
   */
  get slotsTotal() {
    return this._slotsTotal;
  }
  
  /**
   * Get the number of available slots
   * @returns {number} The number of available slots
   */
  get slotsAvailable() {
    return this._slotsAvailable;
  }
  
  /**
   * Get the price per slot
   * @returns {Money} The price per slot
   */
  get pricePerSlot() {
    return this._pricePerSlot;
  }
  
  /**
   * Get the access instructions
   * @returns {AccessInstructions|null} The access instructions
   */
  get accessInstructions() {
    return this._accessInstructions;
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
   * Update the subscription
   * @param {Object} changes - The subscription changes
   * @returns {void}
   * @throws {ValidationException} If validation fails
   */
  update(changes) {
    const errors = {};
    
    // Validate changes
    if (changes.slotsTotal !== undefined && changes.slotsTotal <= 0) {
      errors.slotsTotal = 'Total slots must be greater than zero';
    }
    
    if (changes.slotsAvailable !== undefined && 
        (changes.slotsAvailable < 0 || 
         changes.slotsAvailable > (changes.slotsTotal || this._slotsTotal))) {
      errors.slotsAvailable = 'Available slots must be between 0 and total slots';
    }
    
    if (changes.pricePerSlot !== undefined && changes.pricePerSlot <= 0) {
      errors.pricePerSlot = 'Price per slot must be greater than zero';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid subscription data', errors);
    }
    
    // Apply changes
    if (changes.status) {
      this._status = SubscriptionStatus.fromString(changes.status);
    }
    
    if (changes.slotsTotal !== undefined) {
      this._slotsTotal = changes.slotsTotal;
      
      // Ensure slotsAvailable doesn't exceed slotsTotal
      if (this._slotsAvailable > this._slotsTotal) {
        this._slotsAvailable = this._slotsTotal;
      }
    }
    
    if (changes.slotsAvailable !== undefined) {
      this._slotsAvailable = changes.slotsAvailable;
    }
    
    if (changes.pricePerSlot !== undefined) {
      this._pricePerSlot = Money.create(
        changes.pricePerSlot,
        changes.currency || this._pricePerSlot.currency
      );
    }
    
    this._updatedAt = new Date();
  }
  
  /**
   * Change the subscription status
   * @param {string} status - New status
   * @returns {void}
   */
  changeStatus(status) {
    this._status = SubscriptionStatus.fromString(status);
    this._updatedAt = new Date();
  }
  
  /**
   * Set access instructions
   * @param {string} plainText - Plain text instructions
   * @param {string} encryptionKeyId - ID of the encryption key
   * @returns {void}
   * @throws {ValidationException} If validation fails
   */
  setAccessInstructions(plainText, encryptionKeyId) {
    this._accessInstructions = AccessInstructions.create(plainText, encryptionKeyId);
    this._updatedAt = new Date();
  }
  
  /**
   * Reserve slots for purchase
   * @param {number} count - Number of slots to reserve
   * @param {string} purchaserId - ID of the purchaser
   * @returns {void}
   * @throws {BusinessRuleViolationException} If not enough slots are available
   */
  reserveSlots(count, purchaserId) {
    // Check if the subscription is active
    if (!this._status.isActive()) {
      throw new BusinessRuleViolationException(
        'Cannot reserve slots for an inactive subscription',
        'inactive_subscription'
      );
    }
    
    // Check if enough slots are available
    if (this._slotsAvailable < count) {
      throw new BusinessRuleViolationException(
        'Not enough slots available',
        'insufficient_slots'
      );
    }
    
    // Reserve slots
    this._slotsAvailable -= count;
    this._updatedAt = new Date();
    
    // Add domain event
    this.addDomainEvent(new SlotsPurchasedEvent(this, count, purchaserId));
  }
  
  /**
   * Add more slots to the subscription
   * @param {number} count - Number of slots to add
   * @returns {void}
   * @throws {ValidationException} If validation fails
   */
  addSlots(count) {
    if (count <= 0) {
      throw new ValidationException('Invalid slot count', {
        count: 'Slot count must be greater than zero'
      });
    }
    
    this._slotsTotal += count;
    this._slotsAvailable += count;
    this._updatedAt = new Date();
  }
  
  /**
   * Check if the subscription can be purchased
   * @returns {boolean} True if purchasable
   */
  isPurchasable() {
    return this._status.isActive() && this._slotsAvailable > 0;
  }
  
  /**
   * Check if the subscription has access instructions
   * @returns {boolean} True if access instructions are set
   */
  hasAccessInstructions() {
    return this._accessInstructions !== null;
  }
}