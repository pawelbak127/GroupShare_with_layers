const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when a dispute is created
 * @extends DomainEvent
 */
class DisputeCreatedEvent extends DomainEvent {
  /**
   * @param {Dispute} dispute - The created dispute
   */
  constructor(dispute) {
    super();
    this._disputeId = dispute.id;
    this._reporterId = dispute.reporterId;
    this._reportedEntityType = dispute.reportedEntityType;
    this._reportedEntityId = dispute.reportedEntityId;
    this._disputeType = dispute.disputeType.toString();
    this._transactionId = dispute.transactionId;
  }
  
  /**
   * Get the dispute ID
   * @returns {string} The dispute ID
   */
  get disputeId() {
    return this._disputeId;
  }
  
  /**
   * Get the reporter ID
   * @returns {string} The reporter ID
   */
  get reporterId() {
    return this._reporterId;
  }
  
  /**
   * Get the reported entity type
   * @returns {string} The reported entity type
   */
  get reportedEntityType() {
    return this._reportedEntityType;
  }
  
  /**
   * Get the reported entity ID
   * @returns {string} The reported entity ID
   */
  get reportedEntityId() {
    return this._reportedEntityId;
  }
  
  /**
   * Get the dispute type
   * @returns {string} The dispute type
   */
  get disputeType() {
    return this._disputeType;
  }
  
  /**
   * Get the transaction ID
   * @returns {string} The transaction ID
   */
  get transactionId() {
    return this._transactionId;
  }
}