const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when a member is added to a group
 * @extends DomainEvent
 */
class MemberAddedEvent extends DomainEvent {
  /**
   * @param {Group} group - The group
   * @param {GroupMember} member - The added member
   */
  constructor(group, member) {
    super();
    this._groupId = group.id;
    this._userId = member.userId;
    this._role = member.role.toString();
    this._status = member.status.toString();
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
   * @returns {string} The role
   */
  get role() {
    return this._role;
  }
  
  /**
   * Get the status
   * @returns {string} The status
   */
  get status() {
    return this._status;
  }
}