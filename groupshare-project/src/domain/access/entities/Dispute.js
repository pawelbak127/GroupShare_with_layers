const { Entity } = require('../../shared/Entity');
const { Id } = require('../../shared/value-objects/Id');
const { ValidationException } = require('../../shared/exceptions/DomainException');
const DisputeStatus = require('../value-objects/DisputeStatus');
const DisputeType = require('../value-objects/DisputeType');

/**
 * Dispute entity for handling access-related disputes
 * @extends Entity
 */
class Dispute extends Entity {
  /**
   * @param {Id} id - Dispute ID
   * @param {string} reporterId - Reporter user ID
   * @param {string} reportedEntityType - Type of reported entity
   * @param {string} reportedEntityId - ID of reported entity
   * @param {string} transactionId - Transaction ID
   * @param {DisputeType} disputeType - Dispute type
   * @param {string} description - Dispute description
   * @param {DisputeStatus} status - Dispute status
   * @param {boolean} evidenceRequired - Whether evidence is required
   * @param {Date} resolutionDeadline - Resolution deadline
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @private
   */
  constructor(
    id,
    reporterId,
    reportedEntityType,
    reportedEntityId,
    transactionId,
    disputeType,
    description,
    status,
    evidenceRequired,
    resolutionDeadline,
    createdAt,
    updatedAt
  ) {
    super();
    this._id = id;
    this._reporterId = reporterId;
    this._reportedEntityType = reportedEntityType;
    this._reportedEntityId = reportedEntityId;
    this._transactionId = transactionId;
    this._disputeType = disputeType;
    this._description = description;
    this._status = status;
    this._evidenceRequired = evidenceRequired;
    this._resolutionDeadline = resolutionDeadline;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._resolutionNotes = '';
    this._evidence = [];
  }
  
  /**
   * Create a new dispute
   * @param {Id} id - Dispute ID
   * @param {string} reporterId - Reporter user ID
   * @param {string} reportedEntityType - Type of reported entity
   * @param {string} reportedEntityId - ID of reported entity
   * @param {string} transactionId - Transaction ID
   * @param {string} disputeType - Dispute type
   * @param {string} description - Dispute description
   * @param {boolean} [evidenceRequired=false] - Whether evidence is required
   * @param {number} [resolutionDays=3] - Days until resolution deadline
   * @returns {Dispute} A new Dispute instance
   * @throws {ValidationException} If validation fails
   */
  static create(
    id,
    reporterId,
    reportedEntityType,
    reportedEntityId,
    transactionId,
    disputeType,
    description,
    evidenceRequired = false,
    resolutionDays = 3
  ) {
    // Validate input
    const errors = {};
    
    if (!reporterId) {
      errors.reporterId = 'Reporter ID is required';
    }
    
    if (!reportedEntityType) {
      errors.reportedEntityType = 'Reported entity type is required';
    }
    
    if (!reportedEntityId) {
      errors.reportedEntityId = 'Reported entity ID is required';
    }
    
    if (!description || description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid dispute data', errors);
    }
    
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + resolutionDays);
    
    return new Dispute(
      id,
      reporterId,
      reportedEntityType,
      reportedEntityId,
      transactionId,
      DisputeType.fromString(disputeType),
      description.trim(),
      DisputeStatus.OPEN,
      evidenceRequired,
      deadline,
      now,
      now
    );
  }
  
  /**
   * Restore a dispute from persistence
   * @param {string} id - Dispute ID
   * @param {string} reporterId - Reporter user ID
   * @param {string} reportedEntityType - Type of reported entity
   * @param {string} reportedEntityId - ID of reported entity
   * @param {string} transactionId - Transaction ID
   * @param {string} disputeType - Dispute type
   * @param {string} description - Dispute description
   * @param {string} status - Dispute status
   * @param {boolean} evidenceRequired - Whether evidence is required
   * @param {Date} resolutionDeadline - Resolution deadline
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {string} [resolutionNotes=''] - Resolution notes
   * @param {Array} [evidence=[]] - Evidence items
   * @returns {Dispute} A restored Dispute instance
   */
  static restore(
    id,
    reporterId,
    reportedEntityType,
    reportedEntityId,
    transactionId,
    disputeType,
    description,
    status,
    evidenceRequired,
    resolutionDeadline,
    createdAt,
    updatedAt,
    resolutionNotes = '',
    evidence = []
  ) {
    const dispute = new Dispute(
      Id.from(id),
      reporterId,
      reportedEntityType,
      reportedEntityId,
      transactionId,
      DisputeType.fromString(disputeType),
      description,
      DisputeStatus.fromString(status),
      evidenceRequired,
      new Date(resolutionDeadline),
      new Date(createdAt),
      new Date(updatedAt)
    );
    
    dispute._resolutionNotes = resolutionNotes;
    dispute._evidence = evidence;
    
    return dispute;
  }
  
  /**
   * Get the dispute ID
   * @returns {string} The dispute ID
   */
  get id() {
    return this._id.toString();
  }
  
  /**
   * Get the reporter user ID
   * @returns {string} The reporter user ID
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
   * Get the transaction ID
   * @returns {string} The transaction ID
   */
  get transactionId() {
    return this._transactionId;
  }
  
  /**
   * Get the dispute type
   * @returns {DisputeType} The dispute type
   */
  get disputeType() {
    return this._disputeType;
  }
  
  /**
   * Get the dispute description
   * @returns {string} The dispute description
   */
  get description() {
    return this._description;
  }
  
  /**
   * Get the dispute status
   * @returns {DisputeStatus} The dispute status
   */
  get status() {
    return this._status;
  }
  
  /**
   * Check if evidence is required
   * @returns {boolean} True if evidence is required
   */
  get evidenceRequired() {
    return this._evidenceRequired;
  }
  
  /**
   * Get the resolution deadline
   * @returns {Date} The resolution deadline
   */
  get resolutionDeadline() {
    return new Date(this._resolutionDeadline);
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
   * Get the resolution notes
   * @returns {string} The resolution notes
   */
  get resolutionNotes() {
    return this._resolutionNotes;
  }
  
  /**
   * Get the evidence items
   * @returns {Array} The evidence items
   */
  get evidence() {
    return [...this._evidence];
  }
  
  /**
   * Add evidence to the dispute
   * @param {Object} evidence - Evidence item
   * @returns {void}
   */
  addEvidence(evidence) {
    this._evidence.push(evidence);
    this._updatedAt = new Date();
  }
  
  /**
   * Resolve the dispute
   * @param {string} notes - Resolution notes
   * @returns {void}
   * @throws {ValidationException} If notes are not provided
   */
  resolve(notes) {
    if (!notes || notes.trim().length === 0) {
      throw new ValidationException('Invalid resolution', {
        notes: 'Resolution notes are required'
      });
    }
    
    this._status = DisputeStatus.RESOLVED;
    this._resolutionNotes = notes.trim();
    this._updatedAt = new Date();
  }
  
  /**
   * Close the dispute
   * @returns {void}
   */
  close() {
    this._status = DisputeStatus.CLOSED;
    this._updatedAt = new Date();
  }
  
  /**
   * Check if the dispute is open
   * @returns {boolean} True if open
   */
  isOpen() {
    return this._status.isOpen();
  }
  
  /**
   * Check if the dispute is past the resolution deadline
   * @returns {boolean} True if past deadline
   */
  isPastDeadline() {
    return new Date() > this._resolutionDeadline;
  }
}