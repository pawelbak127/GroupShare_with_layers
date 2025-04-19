// src/domain/subscription/Subscription.js

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
   * Prywatny konstruktor - używany tylko przez metody fabryczne
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
   * Metoda fabryczna dla tworzenia nowej subskrypcji
   * @public
   */
  static create(groupId, platformId, slotsTotal, pricePerSlot, currency = 'PLN') {
    // Walidacja wejścia
    this.validateCreationParams(groupId, platformId, slotsTotal, pricePerSlot);
    
    const id = Id.create();
    const now = new Date();
    
    const subscription = new Subscription(
      id,
      groupId,
      platformId,
      SubscriptionStatus.ACTIVE,
      slotsTotal,
      slotsTotal, // Początkowo wszystkie sloty są dostępne
      Money.create(pricePerSlot, currency),
      now,
      now
    );
    
    // Dodaj zdarzenie domenowe
    subscription.addDomainEvent(new SubscriptionCreatedEvent(subscription));
    
    return subscription;
  }
  
  /**
   * Metoda fabryczna do przywracania encji z bazy danych
   * @public
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
    // Przywracanie obiektu bez walidacji biznesowej
    // Zakładamy, że dane z bazy są poprawne
    
    // Przywróć obiekty wartości
    const idObj = Id.from(id);
    const statusObj = SubscriptionStatus.fromString(status);
    const priceObj = Money.create(pricePerSlot, currency);
    
    // Przywróć instrukcje dostępu, jeśli istnieją
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
      idObj,
      groupId,
      platformId,
      statusObj,
      slotsTotal,
      slotsAvailable,
      priceObj,
      new Date(createdAt),
      new Date(updatedAt),
      accessInstructions
    );
  }
  
  /**
   * Walidacja parametrów tworzenia subskrypcji
   * @private
   */
  static validateCreationParams(groupId, platformId, slotsTotal, pricePerSlot) {
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
  }
  
  /**
   * Waliduje parametry aktualizacji
   * @private
   */
  validateUpdateParams(changes) {
    const errors = {};
    
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
  }
  
  // Standardowe gettery
  get id() {
    return this._id.toString();
  }
  
  get groupId() {
    return this._groupId;
  }
  
  get platformId() {
    return this._platformId;
  }
  
  get status() {
    return this._status;
  }
  
  get slotsTotal() {
    return this._slotsTotal;
  }
  
  get slotsAvailable() {
    return this._slotsAvailable;
  }
  
  get pricePerSlot() {
    return this._pricePerSlot;
  }
  
  get accessInstructions() {
    return this._accessInstructions;
  }
  
  get createdAt() {
    return new Date(this._createdAt);
  }
  
  get updatedAt() {
    return new Date(this._updatedAt);
  }
  
  /**
   * Aktualizacja subskrypcji
   */
  update(changes) {
    // Wywołanie wydzielonej walidacji
    this.validateUpdateParams(changes);
    
    // Aplikacja zmian po walidacji
    if (changes.status) {
      this._status = SubscriptionStatus.fromString(changes.status);
    }
    
    if (changes.slotsTotal !== undefined) {
      this._slotsTotal = changes.slotsTotal;
      
      // Upewnienie się, że slotsAvailable nie przekracza slotsTotal
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
   * Zmiana statusu subskrypcji
   */
  changeStatus(status) {
    this._status = SubscriptionStatus.fromString(status);
    this._updatedAt = new Date();
  }
  
  /**
   * Ustawia instrukcje dostępu
   */
  setAccessInstructions(plainText, encryptionKeyId) {
    if (!plainText || plainText.trim().length < 10) {
      throw new ValidationException('Invalid access instructions', {
        accessInstructions: 'Access instructions must be at least 10 characters long'
      });
    }
    
    this._accessInstructions = AccessInstructions.create(plainText, encryptionKeyId);
    this._updatedAt = new Date();
  }
  
  /**
   * Rezerwuje miejsca w subskrypcji
   */
  reserveSlots(count, purchaserId) {
    // Sprawdzenie niezmienników biznesowych
    this.validateReservation(count);
    
    // Po walidacji wykonanie operacji
    this._slotsAvailable -= count;
    this._updatedAt = new Date();
    
    // Emisja zdarzenia
    this.addDomainEvent(new SlotsPurchasedEvent(this, count, purchaserId));
  }
  
  /**
   * Waliduje operację rezerwacji miejsc
   * @private
   */
  validateReservation(count) {
    // Sprawdzenie, czy subskrypcja jest aktywna
    if (!this._status.isActive()) {
      throw new BusinessRuleViolationException(
        'Cannot reserve slots for an inactive subscription',
        'inactive_subscription'
      );
    }
    
    // Sprawdzenie, czy jest wystarczająca liczba miejsc
    if (this._slotsAvailable < count) {
      throw new BusinessRuleViolationException(
        'Not enough slots available',
        'insufficient_slots'
      );
    }
  }
  
  /**
   * Dodaje więcej miejsc do subskrypcji
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
   * Sprawdza, czy subskrypcja może być kupiona
   */
  isPurchasable() {
    return this._status.isActive() && this._slotsAvailable > 0;
  }
  
  /**
   * Sprawdza, czy subskrypcja ma instrukcje dostępu
   */
  hasAccessInstructions() {
    return this._accessInstructions !== null;
  }
}

module.exports = Subscription;