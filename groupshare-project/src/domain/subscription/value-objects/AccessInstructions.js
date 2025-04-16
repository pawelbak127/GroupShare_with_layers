const { ValueObject } = require('../../shared/Entity');
const { ValidationException } = require('../../shared/exceptions/DomainException');

/**
 * Instructions for accessing a subscription
 * @extends ValueObject
 */
class AccessInstructions extends ValueObject {
  /**
   * @param {string} encryptedData - Encrypted instructions data
   * @param {string} encryptionKeyId - ID of the encryption key
   * @param {string} iv - Initialization vector
   * @param {string} encryptionVersion - Encryption version
   * @private
   */
  constructor(encryptedData, encryptionKeyId, iv, encryptionVersion) {
    super();
    this._encryptedData = encryptedData;
    this._encryptionKeyId = encryptionKeyId;
    this._iv = iv;
    this._encryptionVersion = encryptionVersion;
  }
  
  /**
   * Create new access instructions (dummy encryption)
   * @param {string} plainText - Plain text instructions
   * @param {string} encryptionKeyId - ID of the encryption key
   * @returns {AccessInstructions} An AccessInstructions instance
   * @throws {ValidationException} If validation fails
   */
  static create(plainText, encryptionKeyId) {
    // Validate
    if (!plainText || plainText.length < 10) {
      throw new ValidationException('Invalid access instructions', {
        instructions: 'Access instructions must be at least 10 characters long'
      });
    }
    
    if (!encryptionKeyId) {
      throw new ValidationException('Invalid encryption key', {
        encryptionKeyId: 'Encryption key ID is required'
      });
    }
    
    // Dummy encryption - in a real implementation, this would use proper encryption
    const encryptedData = `ENCRYPTED:${Buffer.from(plainText).toString('base64')}`;
    const iv = crypto.randomBytes(16).toString('hex');
    const encryptionVersion = '1.0';
    
    return new AccessInstructions(encryptedData, encryptionKeyId, iv, encryptionVersion);
  }
  
  /**
   * Create from existing encrypted data
   * @param {string} encryptedData - Encrypted instructions data
   * @param {string} encryptionKeyId - ID of the encryption key
   * @param {string} iv - Initialization vector
   * @param {string} encryptionVersion - Encryption version
   * @returns {AccessInstructions} An AccessInstructions instance
   */
  static fromEncrypted(encryptedData, encryptionKeyId, iv, encryptionVersion) {
    return new AccessInstructions(encryptedData, encryptionKeyId, iv, encryptionVersion);
  }
  
  /**
   * Get the encrypted data
   * @returns {string} The encrypted data
   */
  get encryptedData() {
    return this._encryptedData;
  }
  
  /**
   * Get the encryption key ID
   * @returns {string} The encryption key ID
   */
  get encryptionKeyId() {
    return this._encryptionKeyId;
  }
  
  /**
   * Get the initialization vector
   * @returns {string} The initialization vector
   */
  get iv() {
    return this._iv;
  }
  
  /**
   * Get the encryption version
   * @returns {string} The encryption version
   */
  get encryptionVersion() {
    return this._encryptionVersion;
  }
  
  /**
   * Compare with another AccessInstructions instance
   * @param {AccessInstructions} other - Another AccessInstructions to compare with
   * @returns {boolean} True if both instances have the same encrypted data
   */
  equals(other) {
    if (!(other instanceof AccessInstructions)) return false;
    return this._encryptedData === other.encryptedData &&
           this._iv === other.iv &&
           this._encryptionKeyId === other.encryptionKeyId;
  }
}