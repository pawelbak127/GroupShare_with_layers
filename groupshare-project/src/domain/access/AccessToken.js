const { AggregateRoot } = require('../shared/Entity');
const { Id } = require('../shared/value-objects/Id');
const { ValidationException, BusinessRuleViolationException } = require('../shared/exceptions/DomainException');
const TokenStatus = require('./value-objects/TokenStatus');
const Token = require('./value-objects/Token');
const AccessGrantedEvent = require('./events/AccessGrantedEvent');

/**
 * Access token aggregate root
 * @extends AggregateRoot
 */
class AccessToken extends AggregateRoot {
  /**
   * @param {Id} id - Token ID
   * @param {string} purchaseId - Purchase ID
   * @param {Token} token - Token value object
   * @param {Date} expiresAt - Expiration timestamp
   * @param {boolean} used - Whether the token has been used
   * @param {Date} createdAt - Creation timestamp
   * @param {Date|null} usedAt - Usage timestamp
   * @param {string|null} ipAddress - IP address used
   * @param {string|null} userAgent - User agent used
   * @private
   */
  constructor(
    id,
    purchaseId,
    token,
    expiresAt,
    used,
    createdAt,
    usedAt = null,
    ipAddress = null,
    userAgent = null
  ) {
    super();
    this._id = id;
    this._purchaseId = purchaseId;
    this._token = token;
    this._expiresAt = expiresAt;
    this._used = used;
    this._createdAt = createdAt;
    this._usedAt = usedAt;
    this._ipAddress = ipAddress;
    this._userAgent = userAgent;
  }
  
  /**
   * Create a new access token
   * @param {Id} id - Token ID
   * @param {string} purchaseId - Purchase ID
   * @param {number} [expiryMinutes=30] - Expiry time in minutes
   * @param {string} [salt=''] - Salt for token hashing
   * @returns {AccessToken} A new AccessToken instance with token value
   * @throws {ValidationException} If validation fails
   */
  static create(id, purchaseId, expiryMinutes = 30, salt = '') {
    // Validate input
    if (!purchaseId) {
      throw new ValidationException('Invalid access token data', {
        purchaseId: 'Purchase ID is required'
      });
    }
    
    if (expiryMinutes <= 0) {
      throw new ValidationException('Invalid expiry time', {
        expiryMinutes: 'Expiry time must be greater than zero'
      });
    }
    
    const token = Token.generate(salt);
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
    
    const accessToken = new AccessToken(
      id,
      purchaseId,
      token,
      expiresAt,
      false,
      now
    );
    
    // Add domain event
    accessToken.addDomainEvent(new AccessGrantedEvent(accessToken));
    
    return accessToken;
  }
  
  /**
   * Restore an access token from persistence
   * @param {string} id - Token ID
   * @param {string} purchaseId - Purchase ID
   * @param {string} tokenHash - Token hash
   * @param {Date} expiresAt - Expiration timestamp
   * @param {boolean} used - Whether the token has been used
   * @param {Date} createdAt - Creation timestamp
   * @param {Date|null} usedAt - Usage timestamp
   * @param {string|null} ipAddress - IP address used
   * @param {string|null} userAgent - User agent used
   * @returns {AccessToken} A restored AccessToken instance
   */
  static restore(
    id,
    purchaseId,
    tokenHash,
    expiresAt,
    used,
    createdAt,
    usedAt = null,
    ipAddress = null,
    userAgent = null
  ) {
    return new AccessToken(
      Id.from(id),
      purchaseId,
      Token.fromHash(tokenHash),
      new Date(expiresAt),
      used,
      new Date(createdAt),
      usedAt ? new Date(usedAt) : null,
      ipAddress,
      userAgent
    );
  }
  
  /**
   * Get the token ID
   * @returns {string} The token ID
   */
  get id() {
    return this._id.toString();
  }
  
  /**
   * Get the purchase ID
   * @returns {string} The purchase ID
   */
  get purchaseId() {
    return this._purchaseId;
  }
  
  /**
   * Get the token hash
   * @returns {string} The token hash
   */
  get tokenHash() {
    return this._token.hash;
  }
  
  /**
   * Get the token expiration timestamp
   * @returns {Date} The expiration timestamp
   */
  get expiresAt() {
    return new Date(this._expiresAt);
  }
  
  /**
   * Check if the token has been used
   * @returns {boolean} True if used
   */
  get used() {
    return this._used;
  }
  
  /**
   * Get the creation timestamp
   * @returns {Date} The creation timestamp
   */
  get createdAt() {
    return new Date(this._createdAt);
  }
  
  /**
   * Get the usage timestamp
   * @returns {Date|null} The usage timestamp
   */
  get usedAt() {
    return this._usedAt ? new Date(this._usedAt) : null;
  }
  
  /**
   * Get the IP address
   * @returns {string|null} The IP address
   */
  get ipAddress() {
    return this._ipAddress;
  }
  
  /**
   * Get the user agent
   * @returns {string|null} The user agent
   */
  get userAgent() {
    return this._userAgent;
  }
  
  /**
   * Check if the token has expired
   * @returns {boolean} True if expired
   */
  isExpired() {
    return new Date() > this._expiresAt;
  }
  
  /**
   * Get the current token status
   * @returns {TokenStatus} The token status
   */
  getStatus() {
    if (this._used) {
      return TokenStatus.USED;
    }
    
    if (this.isExpired()) {
      return TokenStatus.EXPIRED;
    }
    
    return TokenStatus.ACTIVE;
  }
  
  /**
   * Verify a token value against this token
   * @param {string} tokenValue - Token value to verify
   * @param {string} [salt=''] - Salt for token hashing
   * @returns {boolean} True if verified
   */
  verify(tokenValue, salt = '') {
    const inputToken = Token.fromValue(tokenValue, salt);
    
    // Check if the token has expired
    if (this.isExpired()) {
      return false;
    }
    
    // Check if the token has been used
    if (this._used) {
      return false;
    }
    
    // Verify the token hash
    return this._token.hash === inputToken.hash;
  }
  
  /**
   * Mark the token as used
   * @param {string} [ipAddress=null] - IP address
   * @param {string} [userAgent=null] - User agent
   * @returns {void}
   * @throws {BusinessRuleViolationException} If token is already used or expired
   */
  markAsUsed(ipAddress = null, userAgent = null) {
    // Check if the token has expired
    if (this.isExpired()) {
      throw new BusinessRuleViolationException(
        'Cannot use an expired token',
        'token_expired'
      );
    }
    
    // Check if the token has already been used
    if (this._used) {
      throw new BusinessRuleViolationException(
        'Token has already been used',
        'token_used'
      );
    }
    
    this._used = true;
    this._usedAt = new Date();
    this._ipAddress = ipAddress;
    this._userAgent = userAgent;
  }
}