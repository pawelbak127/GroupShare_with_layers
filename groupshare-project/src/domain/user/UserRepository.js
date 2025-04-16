const { Repository } = require('../shared/Entity');

/**
 * @interface UserRepository
 * @extends Repository<User>
 */
class UserRepository extends Repository {
  /**
   * Find a user by external authentication ID
   * @param {string} externalAuthId - External authentication ID
   * @returns {Promise<User|null>} The user or null if not found
   */
  async findByExternalAuthId(externalAuthId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find a user by email
   * @param {string} email - Email address
   * @returns {Promise<User|null>} The user or null if not found
   */
  async findByEmail(email) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find users by verification level
   * @param {string} level - Verification level
   * @returns {Promise<Array<User>>} List of users
   */
  async findByVerificationLevel(level) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Update a user's profile
   * @param {User} user - The user to update
   * @returns {Promise<void>}
   */
  async updateProfile(user) {
    throw new Error('Method not implemented');
  }
}

// Export all user domain components
module.exports = {
  User,
  UserRepository,
  UserCreatedEvent,
  UserVerifiedEvent,
  VerificationLevel,
  ProfileType
};