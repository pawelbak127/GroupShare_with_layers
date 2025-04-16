const { Repository } = require('../shared/Entity');

/**
 * @interface GroupRepository
 * @extends Repository<Group>
 */
class GroupRepository extends Repository {
  /**
   * Find groups by owner ID
   * @param {string} ownerId - Owner user ID
   * @returns {Promise<Array<Group>>} List of groups
   */
  async findByOwnerId(ownerId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find groups by status
   * @param {string} status - Group status
   * @returns {Promise<Array<Group>>} List of groups
   */
  async findByStatus(status) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find groups where a user is a member
   * @param {string} memberId - Member user ID
   * @returns {Promise<Array<Group>>} List of groups
   */
  async findByMemberId(memberId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Add a member to a group
   * @param {string} groupId - Group ID
   * @param {string} memberId - User ID
   * @param {string} role - Member role
   * @returns {Promise<void>}
   */
  async addMember(groupId, memberId, role) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Remove a member from a group
   * @param {string} groupId - Group ID
   * @param {string} memberId - User ID
   * @returns {Promise<void>}
   */
  async removeMember(groupId, memberId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Update a member's role in a group
   * @param {string} groupId - Group ID
   * @param {string} memberId - User ID
   * @param {string} role - New role
   * @returns {Promise<void>}
   */
  async updateMemberRole(groupId, memberId, role) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find all members of a group
   * @param {string} groupId - Group ID
   * @returns {Promise<Array<GroupMember>>} List of group members
   */
  async findMembers(groupId) {
    throw new Error('Method not implemented');
  }
}

// Export all group domain components
module.exports = {
  Group,
  GroupMember,
  GroupRepository,
  GroupCreatedEvent,
  MemberAddedEvent,
  GroupRole,
  GroupStatus,
  MembershipStatus
};