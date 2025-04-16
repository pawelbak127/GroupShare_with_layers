const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when a user is created
 * @extends DomainEvent
 */
class UserCreatedEvent extends DomainEvent {
  /**
   * @param {User} user - The created user
   */
  constructor(user) {
    super();
    this._userId = user.id;
    this._email = user.email;
    this._displayName = user.displayName;
    this._profileType = user.profileType.toString();
  }
  
  /**
   * Get the user ID
   * @returns {string} The user ID
   */
  get userId() {
    return this._userId;
  }
  
  /**
   * Get the user email
   * @returns {string} The user email
   */
  get email() {
    return this._email;
  }
  
  /**
   * Get the user display name
   * @returns {string} The user display name
   */
  get displayName() {
    return this._displayName;
  }
  
  /**
   * Get the user profile type
   * @returns {string} The user profile type
   */
  get profileType() {
    return this._profileType;
  }
}