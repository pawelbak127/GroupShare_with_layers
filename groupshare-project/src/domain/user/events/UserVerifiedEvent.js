const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when a user is verified
 * @extends DomainEvent
 */
class UserVerifiedEvent extends DomainEvent {
  /**
   * @param {User} user - The verified user
   */
  constructor(user) {
    super();
    this._userId = user.id;
    this._verificationLevel = user.verificationLevel.toString();
  }
  
  /**
   * Get the user ID
   * @returns {string} The user ID
   */
  get userId() {
    return this._userId;
  }
  
  /**
   * Get the verification level
   * @returns {string} The verification level
   */
  get verificationLevel() {
    return this._verificationLevel;
  }
}
