// src/lib/security.js
import crypto from 'crypto';

/**
 * The security utilities module provides functions for securely handling
 * sensitive data like access instructions.
 * 
 * In a production environment, consider using a dedicated service
 * for key management (like AWS KMS or Azure Key Vault).
 */

// Get the encryption key from environment variables
// In a production system, this would be stored more securely
// and potentially be rotated regularly
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'development_key_only_for_local_use_32b';

// Initialization vector length for AES-256-GCM
const IV_LENGTH = 16;

// Auth tag length for AES-256-GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt data using AES-256-GCM
 * @param {string} data - Data to encrypt
 * @returns {string} - Encrypted data as base64 string
 */
export function encryptData(data) {
  if (!data) {
    throw new Error('Data is required for encryption');
  }

  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(ENCRYPTION_KEY),
      iv
    );

    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get the auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    // Format: base64(iv) + ':' + base64(encrypted) + ':' + base64(authTag)
    const result = Buffer.from(iv).toString('base64') +
      ':' + encrypted +
      ':' + authTag.toString('base64');

    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data that was encrypted with AES-256-GCM
 * @param {string} encryptedData - Encrypted data as base64 string
 * @returns {string} - Decrypted data
 */
export function decryptData(encryptedData) {
  if (!encryptedData) {
    throw new Error('Encrypted data is required for decryption');
  }

  try {
    // Split the encrypted data to get IV, encrypted content, and auth tag
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(ENCRYPTION_KEY),
      iv
    );

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure random token
 * @param {number} length - Length of the token in bytes (default: 32)
 * @returns {string} - Random token as a URL-safe base64 string
 */
export function generateSecureToken(length = 32) {
  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Convert to base64
  let token = randomBytes.toString('base64');
  
  // Make it URL-safe
  token = token.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return token;
}

/**
 * Create a hash of a value (e.g., for access tokens)
 * @param {string} value - Value to hash
 * @returns {string} - Hashed value
 */
export function hashValue(value) {
  if (!value) {
    throw new Error('Value is required for hashing');
  }

  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

/**
 * Encrypt an access instruction object
 * @param {Object} instructions - Access instructions object
 * @returns {string} - Encrypted instructions as base64 string
 */
export function encryptAccessInstructions(instructions) {
  if (!instructions) {
    throw new Error('Access instructions are required');
  }

  // Convert object to JSON string
  const jsonString = JSON.stringify(instructions);
  
  // Encrypt the JSON string
  return encryptData(jsonString);
}

/**
 * Decrypt access instructions
 * @param {string} encryptedInstructions - Encrypted instructions
 * @returns {Object} - Decrypted instructions object
 */
export function decryptAccessInstructions(encryptedInstructions) {
  if (!encryptedInstructions) {
    throw new Error('Encrypted instructions are required');
  }

  // Decrypt the data
  const jsonString = decryptData(encryptedInstructions);
  
  // Parse JSON string back to object
  return JSON.parse(jsonString);
}

/**
 * Generate an access token with expiration
 * @param {number} expiresInMinutes - Token expiration time in minutes
 * @returns {Object} - Token object with value and expiration
 */
export function generateAccessToken(expiresInMinutes = 30) {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
  
  return {
    token,
    expiresAt
  };
}

/**
 * Mask sensitive information in a string (e.g., email, password)
 * @param {string} value - Value to mask
 * @param {number} visibleChars - Number of characters to show at the beginning and end
 * @returns {string} - Masked value
 */
export function maskSensitiveInfo(value, visibleChars = 2) {
  if (!value || value.length <= visibleChars * 2) {
    return value;
  }
  
  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  const middle = '•'.repeat(Math.min(value.length - (visibleChars * 2), 8));
  
  return `${start}${middle}${end}`;
}

/**
 * Validate an access token
 * @param {string} token - Token to validate
 * @param {Date} expiresAt - Expiration date of the token
 * @returns {boolean} - Whether the token is valid
 */
export function isValidAccessToken(token, expiresAt) {
  if (!token || !expiresAt) {
    return false;
  }
  
  // Check if token has expired
  const now = new Date();
  if (now > new Date(expiresAt)) {
    return false;
  }
  
  return true;
}
