const { AggregateRoot } = require('../shared/Entity');
const { Id } = require('../shared/value-objects/Id');
const { ValidationException, BusinessRuleViolationException } = require('../shared/exceptions/DomainException');
const GroupStatus = require('./value-objects/GroupStatus');
const GroupMember = require('./entities/GroupMember');
const GroupCreatedEvent = require('./events/GroupCreatedEvent');
const MemberAddedEvent = require('./events/MemberAddedEvent');

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
   * @param {Array<GroupMember>} [members] - Group members
   * @private
   */
  constructor(
    id,
    name,
    ownerId,
    status,
    createdAt,
    updatedAt,
    description = '',
    members = []
  ) {
    super();
    this._id = id;
    this._name = name;
    this._ownerId = ownerId;
    this._status = status;
    this._description = description;
    this._members = new Map(members.map(member => [member.userId, member]));
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
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
    // Validate input
    const errors = {};
    
    if (!name || name.length < 3) {
      errors.name = 'Group name must have at least 3 characters';
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
      name,
      ownerId,
      GroupStatus.ACTIVE,
      now,
      now,
      description
    );
    
    // Add the owner as a member with admin role
    const memberId = Id.create();
    const ownerMember = GroupMember.create(
      memberId,
      id.toString(),
      ownerId,
      'admin',
      'active'
    );
    
    group._members.set(ownerId, ownerMember);
    
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
   * @param {Array<GroupMember>} [members] - Group members
   * @returns {Group} A restored Group instance
   */
  static restore(
    id,
    name,
    ownerId,
    status,
    createdAt,
    updatedAt,
    description = '',
    members = []
  ) {
    return new Group(
      Id.from(id),
      name,
      ownerId,
      GroupStatus.fromString(status),
      new Date(createdAt),
      new Date(updatedAt),
      description,
      members
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
   * Get the owner user ID
   * @returns {string} The owner user ID
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
   * Get all group members
   * @returns {Array<GroupMember>} The group members
   */
  get members() {
    return Array.from(this._members.values());
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
   * @param {Object} changes - The group changes
   * @returns {void}
   * @throws {ValidationException} If validation fails
   */
  update(changes) {
    const errors = {};
    
    // Validate changes
    if (changes.name && changes.name.length < 3) {
      errors.name = 'Group name must have at least 3 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid group data', errors);
    }
    
    // Apply changes
    if (changes.name) {
      this._name = changes.name;
    }
    
    if (changes.description !== undefined) {
      this._description = changes.description;
    }
    
    if (changes.status) {
      this._status = GroupStatus.fromString(changes.status);
    }
    
    this._updatedAt = new Date();
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
   * Add a member to the group
   * @param {Id} memberId - Member ID
   * @param {string} userId - User ID
   * @param {string} role - Member role
   * @param {string} status - Membership status
   * @returns {GroupMember} The added member
   * @throws {BusinessRuleViolationException} If the user is already a member
   */
  addMember(memberId, userId, role = 'member', status = 'pending') {
    // Check if the user is already a member
    if (this._members.has(userId)) {
      throw new BusinessRuleViolationException(
        'User is already a member of this group',
        'unique_membership'
      );
    }
    
    const member = GroupMember.create(
      memberId,
      this.id,
      userId,
      role,
      status
    );
    
    this._members.set(userId, member);
    this._updatedAt = new Date();
    
    // Add domain event
    this.addDomainEvent(new MemberAddedEvent(this, member));
    
    return member;
  }
  
  /**
   * Remove a member from the group
   * @param {string} userId - User ID
   * @returns {void}
   * @throws {BusinessRuleViolationException} If the user is the owner
   */
  removeMember(userId) {
    // Check if the user is the owner
    if (userId === this._ownerId) {
      throw new BusinessRuleViolationException(
        'Cannot remove the owner from the group',
        'owner_removal'
      );
    }
    
    // Check if the user is a member
    if (!this._members.has(userId)) {
      return; // User is not a member, nothing to do
    }
    
    this._members.delete(userId);
    this._updatedAt = new Date();
  }
  
  /**
   * Update a member's role
   * @param {string} userId - User ID
   * @param {string} role - New role
   * @returns {void}
   * @throws {BusinessRuleViolationException} If the user is not a member
   */
  updateMemberRole(userId, role) {
    // Check if the user is a member
    if (!this._members.has(userId)) {
      throw new BusinessRuleViolationException(
        'User is not a member of this group',
        'member_not_found'
      );
    }
    
    const member = this._members.get(userId);
    member.changeRole(role);
    this._updatedAt = new Date();
  }
  
  /**
   * Update a member's status
   * @param {string} userId - User ID
   * @param {string} status - New status
   * @returns {void}
   * @throws {BusinessRuleViolationException} If the user is not a member
   */
  updateMemberStatus(userId, status) {
    // Check if the user is a member
    if (!this._members.has(userId)) {
      throw new BusinessRuleViolationException(
        'User is not a member of this group',
        'member_not_found'
      );
    }
    
    const member = this._members.get(userId);
    member.changeStatus(status);
    this._updatedAt = new Date();
  }
  
  /**
   * Get a member by user ID
   * @param {string} userId - User ID
   * @returns {GroupMember|null} The member or null if not found
   */
  getMember(userId) {
    return this._members.get(userId) || null;
  }
  
  /**
   * Check if a user is a member
   * @param {string} userId - User ID
   * @returns {boolean} True if the user is a member
   */
  isMember(userId) {
    return this._members.has(userId) && this._members.get(userId).isActive();
  }
  
  /**
   * Check if a user is an admin
   * @param {string} userId - User ID
   * @returns {boolean} True if the user is an admin
   */
  isAdmin(userId) {
    const member = this._members.get(userId);
    return member && member.isActive() && member.isAdmin();
  }
  
  /**
   * Check if a user is the owner
   * @param {string} userId - User ID
   * @returns {boolean} True if the user is the owner
   */
  isOwner(userId) {
    return userId === this._ownerId;
  }
  
  /**
   * Transfer ownership to another member
   * @param {string} newOwnerId - New owner user ID
   * @returns {void}
   * @throws {BusinessRuleViolationException} If the new owner is not a member
   */
  transferOwnership(newOwnerId) {
    // Check if the new owner is a member
    if (!this._members.has(newOwnerId)) {
      throw new BusinessRuleViolationException(
        'New owner must be a member of the group',
        'owner_not_member'
      );
    }
    
    // Update the new owner's role to admin if not already
    const newOwnerMember = this._members.get(newOwnerId);
    if (!newOwnerMember.isAdmin()) {
      newOwnerMember.changeRole('admin');
    }
    
    // Update the owner ID
    this._ownerId = newOwnerId;
    this._updatedAt = new Date();
  }
}