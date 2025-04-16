const { DomainEvent } = require('../../shared/Entity');

/**
 * Event emitted when access is granted to a purchase
 * @extends DomainEvent
 */
class AccessGrantedEvent extends DomainEvent {
  /**
   * @param {AccessToken} accessToken - The access token
   */
  constructor(accessToken) {
    super();
    this._tokenId = accessToken.id;
    this._purchaseId = accessToken.purchaseId;
    this._expiresAt = accessToken.expiresAt.toISOString();
  }
  
  /**
   * Get the token ID
   * @returns {string} The token ID
   */
  get tokenId() {
    return this._tokenId;
  }
  
  /**
   * Get the purchase ID
   * @returns {string} The purchase ID
   */
  get purchaseId() {
    return this._purchaseId;
  }
  
  /**
   * Get the token expiration time
   * @returns {string} The expiration time
   */
  get expiresAt() {
    return this._expiresAt;
  }
}