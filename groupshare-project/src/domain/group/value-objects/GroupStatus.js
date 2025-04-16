const { ValueObject } = require('../../shared/Entity');

/**
 * Group status
 * @extends ValueObject
 */
class GroupStatus extends ValueObject {
  static ACTIVE = new GroupStatus('active');
  static INACTIVE = new GroupStatus('inactive');
  static ARCHIVED = new GroupStatus('archived');
  static DELETED = new GroupStatus('deleted');
  
  /**
   * @param {string} status - The group status
   * @private
   */
  constructor(status) {
    super();
    this._status = status;
  }
  
  /**
   * Create a group status from string
   * @param {string} status - The group status string
   * @returns {GroupStatus} A GroupStatus instance
   * @throws {Error} If the status is invalid
   */
  static fromString(status) {
    switch (status.toLowerCase()) {
      case 'active':
        return this.ACTIVE;
      case 'inactive':
        return this.INACTIVE;
      case 'archived':
        return this.ARCHIVED;
      case 'deleted':
        return this.DELETED;
      default:
        throw new Error(`Invalid group status: ${status}`);
    }
  }
  
  /**
   * Get the status value
   * @returns {string} The group status
   */
  get value() {
    return this._status;
  }
  
  /**
   * Check if the group is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this === GroupStatus.ACTIVE;
  }
  
  /**
   * Check if the group is deleted
   * @returns {boolean} True if deleted
   */
  isDeleted() {
    return this === GroupStatus.DELETED;
  }
  
  /**
   * Compare with another GroupStatus
   * @param {GroupStatus} other - Another GroupStatus to compare with
   * @returns {boolean} True if both statuses have the same value
   */
  equals(other) {
    if (!(other instanceof GroupStatus)) return false;
    return this._status === other.value;
  }
  
  /**
   * Convert to string
   * @returns {string} String representation
   */
  toString() {
    return this._status;
  }
}