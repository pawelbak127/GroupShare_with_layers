import { encryptHybrid, decryptHybrid } from './hybrid-encryption';

/**
 * Serwis do szyfrowania i deszyfrowania instrukcji dostępowych
 */
export class InstructionEncryptionService {
  constructor(keyManagementSystem) {
    this.kms = keyManagementSystem;
  }
  
  // Szyfrowanie instrukcji dostępowych
  async encryptInstructions(instructions, keyId) {
    try {
      // 1. Pobranie klucza publicznego
      const publicKey = await this.kms.getPublicKey(keyId);
      
      // 2. Szyfrowanie instrukcji
      const encryptedPackage = await encryptHybrid(instructions, publicKey);
      
      return {
        encryptedData: encryptedPackage.encryptedData,
        encryptedKey: encryptedPackage.encryptedKey,
        iv: encryptedPackage.iv,
        authTag: encryptedPackage.authTag,
        keyId,
        version: '1.0'
      };
    } catch (error) {
      console.error('Error encrypting instructions:', error);
      throw new Error('Failed to encrypt instructions');
    }
  }
  
  // Deszyfrowanie instrukcji dostępowych
  async decryptInstructions(encryptedPackage) {
    try {
      // 1. Pobranie i deszyfrowanie klucza prywatnego
      const privateKey = await this.kms.getPrivateKey(encryptedPackage.keyId);
      
      // 2. Deszyfrowanie instrukcji
      const decryptedInstructions = await decryptHybrid({
        encryptedData: encryptedPackage.encryptedData,
        encryptedKey: encryptedPackage.encryptedKey,
        iv: encryptedPackage.iv,
        authTag: encryptedPackage.authTag
      }, privateKey);
      
      return decryptedInstructions;
    } catch (error) {
      console.error('Error decrypting instructions:', error);
      throw new Error('Failed to decrypt instructions');
    }
  }
}