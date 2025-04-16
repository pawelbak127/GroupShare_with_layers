const { AggregateRoot } = require('../shared/Entity');
const { Id } = require('../shared/value-objects/Id');
const { Email } = require('../shared/value-objects/Email');
const { ValidationException } = require('../shared/exceptions/DomainException');
const VerificationLevel = require('./value-objects/VerificationLevel');
const ProfileType = require('./value-objects/ProfileType');
const UserCreatedEvent = require('./events/UserCreatedEvent');
const UserVerifiedEvent = require('./events/UserVerifiedEvent');

/**
 * User aggregate root
 * @extends AggregateRoot
 */
class User extends AggregateRoot {
  /**
   * @param {Id} id - User ID
   * @param {string} externalAuthId - External authentication ID
   * @param {string} displayName - Display name
   * @param {Email} email - Email address
   * @param {ProfileType} profileType - Profile type
   * @param {VerificationLevel} verificationLevel - Verification level
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {string} [bio] - User bio
   * @param {string} [avatarUrl] - Avatar URL
   * @param {number} [ratingAvg] - Average rating
   * @param {number} [ratingCount] - Rating count
   * @private
   */
  constructor(
    id,
    externalAuthId,
    displayName,
    email,
    profileType,
    verificationLevel,
    createdAt,
    updatedAt,
    bio = '',
    avatarUrl = null,
    ratingAvg = 0,
    ratingCount = 0
  ) {
    super();
    this._id = id;
    this._externalAuthId = externalAuthId;
    this._displayName = displayName;
    this._email = email;
    this._profileType = profileType;
    this._verificationLevel = verificationLevel;
    this._bio = bio;
    this._avatarUrl = avatarUrl;
    this._ratingAvg = ratingAvg;
    this._ratingCount = ratingCount;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }
  
  /**
   * Create a new user
   * @param {Id} id - User ID
   * @param {string} externalAuthId - External authentication ID
   * @param {string} displayName - Display name
   * @param {string} email - Email address
   * @param {string} [profileType='both'] - Profile type
   * @returns {User} A new User instance
   * @throws {ValidationException} If validation fails
   */
  static create(id, externalAuthId, displayName, email, profileType = 'both') {
    // Validate input
    const errors = {};
    
    if (!externalAuthId) {
      errors.externalAuthId = 'External authentication ID is required';
    }
    
    if (!displayName || displayName.length < 2) {
      errors.displayName = 'Display name must have at least 2 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid user data', errors);
    }
    
    const emailObj = Email.create(email);
    const profileTypeObj = ProfileType.fromString(profileType);
    const now = new Date();
    
    const user = new User(
      id,
      externalAuthId,
      displayName,
      emailObj,
      profileTypeObj,
      VerificationLevel.BASIC,
      now,
      now
    );
    
    // Add domain event
    user.addDomainEvent(new UserCreatedEvent(user));
    
    return user;
  }
  
  /**
   * Restore a user from persistence
   * @param {string} id - User ID
   * @param {string} externalAuthId - External authentication ID
   * @param {string} displayName - Display name
   * @param {string} email - Email address
   * @param {string} profileType - Profile type
   * @param {string} verificationLevel - Verification level
   * @param {Date} createdAt - Creation timestamp
   * @param {Date} updatedAt - Last update timestamp
   * @param {string} [bio] - User bio
   * @param {string} [avatarUrl] - Avatar URL
   * @param {number} [ratingAvg] - Average rating
   * @param {number} [ratingCount] - Rating count
   * @returns {User} A restored User instance
   */
  static restore(
    id,
    externalAuthId,
    displayName,
    email,
    profileType,
    verificationLevel,
    createdAt,
    updatedAt,
    bio = '',
    avatarUrl = null,
    ratingAvg = 0,
    ratingCount = 0
  ) {
    return new User(
      Id.from(id),
      externalAuthId,
      displayName,
      Email.create(email),
      ProfileType.fromString(profileType),
      VerificationLevel.fromString(verificationLevel),
      new Date(createdAt),
      new Date(updatedAt),
      bio,
      avatarUrl,
      ratingAvg,
      ratingCount
    );
  }
  
  /**
   * Get the user ID
   * @returns {string} The user ID
   */
  get id() {
    return this._id.toString();
  }
  
  /**
   * Get the external authentication ID
   * @returns {string} The external authentication ID
   */
  get externalAuthId() {
    return this._externalAuthId;
  }
  
  /**
   * Get the display name
   * @returns {string} The display name
   */
  get displayName() {
    return this._displayName;
  }
  
  /**
   * Get the email address
   * @returns {string} The email address
   */
  get email() {
    return this._email.value;
  }
  
  /**
   * Get the profile type
   * @returns {ProfileType} The profile type
   */
  get profileType() {
    return this._profileType;
  }
  
  /**
   * Get the verification level
   * @returns {VerificationLevel} The verification level
   */
  get verificationLevel() {
    return this._verificationLevel;
  }
  
  /**
   * Get the bio
   * @returns {string} The bio
   */
  get bio() {
    return this._bio;
  }
  
  /**
   * Get the avatar URL
   * @returns {string|null} The avatar URL
   */
  get avatarUrl() {
    return this._avatarUrl;
  }
  
  /**
   * Get the average rating
   * @returns {number} The average rating
   */
  get ratingAvg() {
    return this._ratingAvg;
  }
  
  /**
   * Get the rating count
   * @returns {number} The rating count
   */
  get ratingCount() {
    return this._ratingCount;
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
   * Update the user profile
   * @param {Object} changes - The profile changes
   * @returns {void}
   * @throws {ValidationException} If validation fails
   */
  updateProfile(changes) {
    const errors = {};
    
    // Validate changes
    if (changes.displayName && changes.displayName.length < 2) {
      errors.displayName = 'Display name must have at least 2 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationException('Invalid profile data', errors);
    }
    
    // Apply changes
    if (changes.displayName) {
      this._displayName = changes.displayName;
    }
    
    if (changes.bio !== undefined) {
      this._bio = changes.bio;
    }
    
    if (changes.avatarUrl !== undefined) {
      this._avatarUrl = changes.avatarUrl;
    }
    
    if (changes.profileType) {
      this._profileType = ProfileType.fromString(changes.profileType);
    }
    
    this._updatedAt = new Date();
  }
  
  /**
   * Verify the user
   * @returns {void}
   */
  verify() {
    if (this._verificationLevel.isVerified()) {
      return; // Already verified
    }
    
    this._verificationLevel = VerificationLevel.VERIFIED;
    this._updatedAt = new Date();
    
    this.addDomainEvent(new UserVerifiedEvent(this));
  }
  
  /**
   * Add a new rating
   * @param {number} rating - The rating value (0-5)
   * @returns {void}
   * @throws {ValidationException} If validation fails
   */
  addRating(rating) {
    if (rating < 0 || rating > 5) {
      throw new ValidationException('Invalid rating', { rating: 'Rating must be between 0 and 5' });
    }
    
    const totalRatingValue = this._ratingAvg * this._ratingCount;
    this._ratingCount += 1;
    this._ratingAvg = (totalRatingValue + rating) / this._ratingCount;
    this._updatedAt = new Date();
  }
  
  /**
   * Check if the user can buy
   * @returns {boolean} True if the user can buy
   */
  canBuy() {
    return this._profileType.canBuy();
  }
  
  /**
   * Check if the user can sell
   * @returns {boolean} True if the user can sell
   */
  canSell() {
    return this._profileType.canSell();
  }
  
  /**
   * Check if the user is verified
   * @returns {boolean} True if the user is verified
   */
  isVerified() {
    return this._verificationLevel.isVerified();
  }
}