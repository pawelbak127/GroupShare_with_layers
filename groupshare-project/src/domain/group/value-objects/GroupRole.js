const { ValueObject } = require('../../shared/Entity');

/**
 * Group role for a member
 * @extends ValueObject
 */
class GroupRole extends ValueObject {
  static ADMIN = new GroupRole('admin');
  static MEMBER = new GroupRole('member');
  
  /**
   * @param {string} role - The group role
   * @private
   */
  constructor(role) {
    super();
    this._role = role;
  }
  
  /**
   * Create a group role from string
   * @param {string} role - The group role string
   * @returns {GroupRole} A GroupRole instance
   * @throws {Error} If the role is invalid
   */
  static fromString(role) {
    switch (role.toLowerCase()) {
      case 'admin':
        return this.ADMIN;
      case 'member':
        return this.MEMBER;
      default:
        throw new Error(`Invalid group role: ${role}`);
    }
  }
  
  /**
   * Get the role value
   * @returns {string} The group role
   */
  get value() {
    return this._role;
  }
  
  /**
   * Check if this is an admin role
   * @returns {boolean} True if admin
   */
  isAdmin() {
    return this === GroupRole.ADMIN;
  }
  
  /**
   * Compare with another GroupRole
   * @param {GroupRole} other - Another GroupRole to compare with
   * @returns {boolean} True if both roles have the same value
   */
  equals(other) {
    if (!(other instanceof GroupRole)) return false;
    return this._role === other.value;
  }
  
  /**
   * Convert to string
   * @returns {string} String representation
   */
  toString() {
    return this._role;
  }
}