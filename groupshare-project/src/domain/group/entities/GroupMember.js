const { Entity } = require('../../shared/Entity');
const { Id } = require('../../shared/value-objects/Id');
const GroupRole = require('../value-objects/GroupRole');
const MembershipStatus = require('../value-objects/MembershipStatus');

/**
 * Group member entity
 * @extends Entity
 */
class GroupMember extends Entity {
  /**
   * @param {Id} id - Member ID
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {GroupRole} role - Member role
   * @param {MembershipStatus} status - Membership status
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @private
   */
  constructor(
    id,
    groupId,
    userId,
    role,
    status,
    createdAt,
    updatedAt
  ) {
    super();
    this._id = id;
    this._groupId = groupId;
    this._userId = userId;
    this._role = role;
    this._status = status;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }
  
  /**
   * Create a new group member
   * @param {Id} id - Member ID
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {string} role - Member role
   * @param {string} status - Membership status
   * @returns {GroupMember} A new GroupMember instance
   */
  static create(id, groupId, userId, role = 'member', status = 'pending') {
    const now = new Date();
    
    return new GroupMember(
      id,
      groupId,
      userId,
      GroupRole.fromString(role),
      MembershipStatus.fromString(status),
      now,
      now
    );
  }
  
  /**
   * Restore a group member from persistence
   * @param {string} id - Member ID
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {string} role - Member role
   * @param {string} status - Membership status
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @returns {GroupMember} A restored GroupMember instance
   */
  static restore(
    id,
    groupId,
    userId,
    role,
    status,
    createdAt,
    updatedAt
  ) {
    return new GroupMember(
      Id.from(id),
      groupId,
      userId,
      GroupRole.fromString(role),
      MembershipStatus.fromString(status),
      new Date(createdAt),
      new Date(updatedAt)
    );
  }
  
  /**
   * Get the member ID
   * @returns {string} The member ID
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
   * Get the user ID
   * @returns {string} The user ID
   */
  get userId() {
    return this._userId;
  }
  
  /**
   * Get the role
   * @returns {GroupRole} The role
   */
  get role() {
    return this._role;
  }
  
  /**
   * Get the status
   * @returns {MembershipStatus} The status
   */
  get status() {
    return this._status;
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
   * Change the member role
   * @param {string} role - New role
   * @returns {void}
   */
  changeRole(role) {
    this._role = GroupRole.fromString(role);
    this._updatedAt = new Date();
  }
  
  /**
   * Change the membership status
   * @param {string} status - New status
   * @returns {void}
   */
  changeStatus(status) {
    this._status = MembershipStatus.fromString(status);
    this._updatedAt = new Date();
  }
  
  /**
   * Activate the membership
   * @returns {void}
   */
  activate() {
    this._status = MembershipStatus.ACTIVE;
    this._updatedAt = new Date();
  }
  
  /**
   * Deactivate the membership
   * @returns {void}
   */
  deactivate() {
    this._status = MembershipStatus.INACTIVE;
    this._updatedAt = new Date();
  }
  
  /**
   * Check if the member is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this._status.isActive();
  }
  
  /**
   * Check if the member is an admin
   * @returns {boolean} True if admin
   */
  isAdmin() {
    return this._role.isAdmin();
  }
}