const { AggregateRoot } = require('../shared/Entity');
const { Id } = require('../shared/value-objects/Id');
const { ValidationException, BusinessRuleViolationException } = require('../shared/exceptions/DomainException');
const GroupStatus = require('./value-objects/GroupStatus');
const GroupCreatedEvent = require('./events/GroupCreatedEvent');

/**
 * Group aggregate root
 * @extends AggregateRoot
 */
class Group extends AggregateRoot {
  /**
   * @param {Id} id - Group ID
   * @param {string} name - Group name
   * @param {string} ownerId - Owner user ID
   * @param {GroupStatus} status - Group status
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {string} [description] - Group description
   * @private
   */
  constructor(
    id,
    name,
    ownerId,
    status,
    createdAt,
    updatedAt,
    description = ''
  ) {
    super();
    this._id = id;
    this._name = name;
    this._ownerId = ownerId;
    this._status = status;
    this._description = description;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    
    // Validate state on creation
    this.validateState();
  }
  
  /**
   * Create a new group
   * @param {Id} id - Group ID
   * @param {string} name - Group name
   * @param {string} ownerId - Owner user ID
   * @param {string} [description] - Group description
   * @returns {Group} A new Group instance
   * @throws {ValidationException} If validation fails
   */
  static create(id, name, ownerId, description = '') {
    // Validate required fields
    const errors = {};
    
    if (!name || name.trim().length < 3) {
      errors.name = 'Group name must be at least 3 characters long';
    }
    
    if (!ownerId) {
      errors.ownerId = 'Owner ID is required';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid group data', errors);
    }
    
    const now = new Date();
    
    const group = new Group(
      id,
      name.trim(),
      ownerId,
      GroupStatus.ACTIVE,
      now,
      now,
      description ? description.trim() : ''
    );
    
    // Add domain event
    group.addDomainEvent(new GroupCreatedEvent(group));
    
    return group;
  }
  
  /**
   * Restore a group from persistence
   * @param {string} id - Group ID
   * @param {string} name - Group name
   * @param {string} ownerId - Owner user ID
   * @param {string} status - Group status
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {string} [description] - Group description
   * @returns {Group} A restored Group instance
   */
  static restore(
    id,
    name,
    ownerId,
    status,
    createdAt,
    updatedAt,
    description = ''
  ) {
    return new Group(
      Id.from(id),
      name,
      ownerId,
      GroupStatus.fromString(status),
      new Date(createdAt),
      new Date(updatedAt),
      description
    );
  }
  
  /**
   * Get the group ID
   * @returns {string} The group ID
   */
  get id() {
    return this._id.toString();
  }
  
  /**
   * Get the group name
   * @returns {string} The group name
   */
  get name() {
    return this._name;
  }
  
  /**
   * Get the owner ID
   * @returns {string} The owner ID
   */
  get ownerId() {
    return this._ownerId;
  }
  
  /**
   * Get the group status
   * @returns {GroupStatus} The group status
   */
  get status() {
    return this._status;
  }
  
  /**
   * Get the group description
   * @returns {string} The group description
   */
  get description() {
    return this._description;
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
   * Update the group
   * @param {Object} changes - The changes to apply
   * @returns {void}
   * @throws {ValidationException} If validation fails
   */
  update(changes) {
    const errors = {};
    
    // Validate name if provided
    if (changes.name !== undefined) {
      if (!changes.name || changes.name.trim().length < 3) {
        errors.name = 'Group name must be at least 3 characters long';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid group data', errors);
    }
    
    // Apply changes
    if (changes.name !== undefined) {
      this._name = changes.name.trim();
    }
    
    if (changes.description !== undefined) {
      this._description = changes.description ? changes.description.trim() : '';
    }
    
    // Update timestamp
    this._updatedAt = new Date();
    
    // Validate the new state
    this.validateState();
  }
  
  /**
   * Change the group status
   * @param {string} status - New status
   * @returns {void}
   */
  changeStatus(status) {
    this._status = GroupStatus.fromString(status);
    this._updatedAt = new Date();
  }
  
  /**
   * Archive the group
   * @returns {void}
   */
  archive() {
    this._status = GroupStatus.ARCHIVED;
    this._updatedAt = new Date();
  }
  
  /**
   * Activate the group
   * @returns {void}
   */
  activate() {
    this._status = GroupStatus.ACTIVE;
    this._updatedAt = new Date();
  }
  
  /**
   * Deactivate the group
   * @returns {void}
   */
  deactivate() {
    this._status = GroupStatus.INACTIVE;
    this._updatedAt = new Date();
  }
  
  /**
   * Check if the group is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this._status.isActive();
  }
  
  /**
   * Transfer ownership to another user
   * @param {string} newOwnerId - ID of the new owner
   * @returns {void}
   * @throws {BusinessRuleViolationException} If validation fails
   */
  transferOwnership(newOwnerId) {
    if (!newOwnerId) {
      throw new BusinessRuleViolationException(
        'New owner ID is required',
        'transfer_ownership_validation'
      );
    }
    
    if (newOwnerId === this._ownerId) {
      throw new BusinessRuleViolationException(
        'New owner cannot be the same as current owner',
        'transfer_ownership_validation'
      );
    }
    
    this._ownerId = newOwnerId;
    this._updatedAt = new Date();
  }
  
  /**
   * Validate the group state (invariants)
   * @private
   * @throws {BusinessRuleViolationException} If validation fails
   */
  validateState() {
    // Invariant: Group must have a name of at least 3 characters
    if (!this._name || this._name.trim().length < 3) {
      throw new BusinessRuleViolationException(
        'Group name must be at least 3 characters long',
        'group_name_invariant'
      );
    }
    
    // Invariant: Group must have an owner
    if (!this._ownerId) {
      throw new BusinessRuleViolationException(
        'Group must have an owner',
        'group_owner_invariant'
      );
    }
  }
}

module.exports = Group;