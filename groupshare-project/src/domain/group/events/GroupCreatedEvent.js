const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when a group is created
 * @extends DomainEvent
 */
class GroupCreatedEvent extends DomainEvent {
  /**
   * @param {Group} group - The created group
   */
  constructor(group) {
    super();
    this._groupId = group.id;
    this._name = group.name;
    this._ownerId = group.ownerId;
  }
  
  /**
   * Get the group ID
   * @returns {string} The group ID
   */
  get groupId() {
    return this._groupId;
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
}