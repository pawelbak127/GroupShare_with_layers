const crypto = require('crypto');
const { EncryptionException } = require('../exceptions');

/**
 * Serwis zarządzający instrukcjami dostępu do subskrypcji
 */
class AccessInstructionService {
  constructor(encryptionKeyRepository, accessInstructionRepository) {
    this.encryptionKeyRepository = encryptionKeyRepository;
    this.accessInstructionRepository = accessInstructionRepository;
  }

  /**
   * Szyfruje instrukcje dostępu
   * @param {string} plainText Nieszyfrowane instrukcje
   * @returns {Promise<Object>} Zaszyfrowane dane
   * @throws {EncryptionException} W przypadku błędu szyfrowania
   */
  async encryptAccessInstructions(plainText) {
    try {
      // Pobierz aktywny klucz szyfrowania
      const key = await this.getActiveEncryptionKey();
      
      // Generuj wektor inicjalizacyjny
      const iv = crypto.randomBytes(16);
      
      // Szyfruj dane
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.keyValue, 'hex'), iv);
      let encrypted = cipher.update(plainText, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return {
        encryptedData: encrypted,
        encryptionKeyId: key.id,
        iv: iv.toString('hex'),
        encryptionVersion: '1.0'
      };
    } catch (error) {
      throw new EncryptionException('Failed to encrypt access instructions', 'encrypt');
    }
  }
  
  /**
   * Deszyfruje instrukcje dostępu
   * @param {string} encryptedData Zaszyfrowane dane
   * @param {string} encryptionKeyId ID klucza
   * @param {string} iv Wektor inicjalizacyjny
   * @param {string} encryptionVersion Wersja szyfrowania
   * @returns {Promise<string>} Odszyfrowane instrukcje
   * @throws {EncryptionException} W przypadku błędu deszyfrowania
   */
  async decryptAccessInstructions(encryptedData, encryptionKeyId, iv, encryptionVersion) {
    try {
      // Pobierz klucz szyfrowania
      const key = await this.encryptionKeyRepository.findById(encryptionKeyId);
      if (!key) {
        throw new Error('Encryption key not found');
      }
      
      // Deszyfruj dane
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(key.keyValue, 'hex'),
        Buffer.from(iv, 'hex')
      );
      
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new EncryptionException('Failed to decrypt access instructions', 'decrypt');
    }
  }
  
  /**
   * Pobiera aktywny klucz szyfrowania
   * @private
   * @returns {Promise<Object>} Klucz szyfrowania
   * @throws {Error} W przypadku braku aktywnego klucza
   */
  async getActiveEncryptionKey() {
    const key = await this.encryptionKeyRepository.findActive();
    if (!key) {
      throw new Error('No active encryption key found');
    }
    return key;
  }
  
  /**
   * Zapisuje instrukcje dostępu dla subskrypcji
   * @param {string} subscriptionId ID subskrypcji
   * @param {string} plainText Nieszyfrowane instrukcje
   * @returns {Promise<void>}
   */
  async saveAccessInstructions(subscriptionId, plainText) {
    // Szyfruj instrukcje
    const encryptedData = await this.encryptAccessInstructions(plainText);
    
    // Zapisz w bazie danych
    await this.accessInstructionRepository.save({
      subscriptionId,
      ...encryptedData
    });
  }
  
  /**
   * Pobiera instrukcje dostępu dla zakupu
   * @param {string} purchaseId ID zakupu
   * @returns {Promise<string>} Odszyfrowane instrukcje
   * @throws {ResourceNotFoundException} Gdy nie znaleziono
   * @throws {EncryptionException} W przypadku błędu
   */
  async getAccessInstructionsForPurchase(purchaseId) {
    // Pobierz zakup
    const purchase = await this.purchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new ResourceNotFoundException('Purchase not found', 'purchase', purchaseId);
    }
    
    // Sprawdź czy dostęp został przyznany
    if (!purchase.accessProvided) {
      throw new BusinessRuleViolationException(
        'Access not provided for this purchase',
        'access_not_provided'
      );
    }
    
    // Pobierz instrukcje dostępu
    const instructions = await this.accessInstructionRepository.findBySubscriptionId(
      purchase.subscriptionId
    );
    
    if (!instructions) {
      throw new ResourceNotFoundException(
        'Access instructions not found',
        'access_instructions',
        purchase.subscriptionId
      );
    }
    
    // Deszyfruj dane
    return this.decryptAccessInstructions(
      instructions.encryptedData,
      instructions.encryptionKeyId,
      instructions.iv,
      instructions.encryptionVersion
    );
  }
}

module.exports = AccessInstructionService;