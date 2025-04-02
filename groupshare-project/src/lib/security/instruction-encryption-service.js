import { encryptHybrid, decryptHybrid } from './hybrid-encryption';

/**
 * Serwis do szyfrowania i deszyfrowania instrukcji dostępowych
 * Wzmocniona implementacja z lepszymi zabezpieczeniami
 */
export class InstructionEncryptionService {
  /**
   * Inicjalizuje serwis szyfrowania instrukcji
   * @param {KeyManagementService} keyManagementSystem - Serwis zarządzania kluczami
   * @param {Object} options - Opcje konfiguracyjne
   * @param {boolean} options.enableCompression - Czy włączyć kompresję danych
   * @param {boolean} options.enableAdditionalAuthData - Czy używać dodatkowych danych uwierzytelniających
   */
  constructor(keyManagementSystem, options = {}) {
    if (!keyManagementSystem) {
      throw new Error('Key Management Service is required');
    }
    
    this.kms = keyManagementSystem;
    this.enableCompression = options.enableCompression || false;
    this.enableAdditionalAuthData = options.enableAdditionalAuthData || false;
    this.currentVersion = '2.0'; // Wersja algorytmu szyfrowania
  }
  
  /**
   * Szyfruje instrukcje dostępowe
   * @param {string} instructions - Instrukcje do zaszyfrowania
   * @param {string} keyId - ID klucza użytego do szyfrowania
   * @param {Object} metadata - Dodatkowe metadane (opcjonalne)
   * @returns {Promise<Object>} - Obiekt z zaszyfrowanymi danymi
   */
  async encryptInstructions(instructions, keyId, metadata = {}) {
    try {
      // Weryfikacja danych wejściowych
      if (!instructions) {
        throw new Error('Instructions content is required');
      }
      
      if (!keyId) {
        throw new Error('Encryption key ID is required');
      }
      
      // 1. Pobranie klucza publicznego
      const publicKey = await this.kms.getPublicKey(keyId);
      
      // 2. Przygotowanie dodatkowych danych uwierzytelniających (AAD)
      let aad = null;
      if (this.enableAdditionalAuthData) {
        aad = this.prepareAdditionalAuthData(keyId, metadata);
      }
      
      // 3. Kompresja danych (opcjonalnie)
      let dataToEncrypt = instructions;
      let compressed = false;
      
      if (this.enableCompression && instructions.length > 1000) {
        const compressedData = await this.compressData(instructions);
        if (compressedData.length < instructions.length) {
          dataToEncrypt = compressedData;
          compressed = true;
        }
      }
      
      // 4. Szyfrowanie instrukcji
      const encryptedPackage = await encryptHybrid(dataToEncrypt, publicKey, aad);
      
      // 5. Zwróć pakiet zaszyfrowanych danych
      return {
        encryptedData: encryptedPackage.encryptedData,
        encryptedKey: encryptedPackage.encryptedKey,
        iv: encryptedPackage.iv,
        authTag: encryptedPackage.authTag,
        keyId,
        version: this.currentVersion,
        compressed,
        aad: aad ? true : false,
        metadata: metadata.public || {} // Tylko publiczne metadane
      };
    } catch (error) {
      console.error('Error encrypting instructions:', error);
      throw new Error('Failed to encrypt instructions');
    }
  }
  
  /**
   * Deszyfruje instrukcje dostępowe
   * @param {Object} encryptedPackage - Pakiet z zaszyfrowanymi danymi
   * @returns {Promise<string>} - Odszyfrowane instrukcje
   */
  async decryptInstructions(encryptedPackage) {
    try {
      // Weryfikacja danych wejściowych
      if (!encryptedPackage || !encryptedPackage.encryptedData) {
        throw new Error('Encrypted data is required');
      }
      
      if (!encryptedPackage.keyId) {
        throw new Error('Key ID is required');
      }
      
      // 1. Pobranie klucza prywatnego
      const privateKey = await this.kms.getPrivateKey(encryptedPackage.keyId);
      
      // 2. Przygotowanie dodatkowych danych uwierzytelniających (jeśli były użyte)
      let aad = null;
      if (encryptedPackage.aad && this.enableAdditionalAuthData) {
        aad = this.prepareAdditionalAuthData(encryptedPackage.keyId, encryptedPackage.metadata || {});
      }
      
      // 3. Deszyfrowanie instrukcji
      const decryptedData = await decryptHybrid({
        encryptedData: encryptedPackage.encryptedData,
        encryptedKey: encryptedPackage.encryptedKey,
        iv: encryptedPackage.iv,
        authTag: encryptedPackage.authTag,
        aad
      }, privateKey);
      
      // 4. Dekompresja danych (jeśli były skompresowane)
      if (encryptedPackage.compressed) {
        return await this.decompressData(decryptedData);
      }
      
      return decryptedData;
    } catch (error) {
      console.error('Error decrypting instructions:', error);
      throw new Error('Failed to decrypt instructions');
    }
  }
  
  /**
   * Przygotowuje dodatkowe dane uwierzytelniające (AAD) dla szyfrowania
   * @param {string} keyId - ID klucza
   * @param {Object} metadata - Metadane
   * @returns {Buffer} - Dane AAD
   */
  prepareAdditionalAuthData(keyId, metadata) {
    // Tworzenie determinicystycznego AAD bazując na keyId i wybranych metadanych
    const aadObject = {
      keyId,
      timestamp: Math.floor(Date.now() / 86400000), // Dzień jako timestamp (nie sekunda)
      context: metadata.context || 'instruction-access'
    };
    
    return Buffer.from(JSON.stringify(aadObject));
  }
  
  /**
   * Kompresuje dane (zaślepka - w rzeczywistej implementacji używałaby zlib lub innej biblioteki)
   * @param {string} data - Dane do skompresowania
   * @returns {Promise<string>} - Skompresowane dane
   */
  async compressData(data) {
    // Zaślepka - w prawdziwej implementacji użyłaby zlib lub pako
    console.warn('Data compression not implemented');
    return data;
  }
  
  /**
   * Dekompresuje dane (zaślepka - w rzeczywistej implementacji używałaby zlib lub innej biblioteki)
   * @param {string} compressedData - Skompresowane dane
   * @returns {Promise<string>} - Zdekompresowane dane
   */
  async decompressData(compressedData) {
    // Zaślepka - w prawdziwej implementacji użyłaby zlib lub pako
    console.warn('Data decompression not implemented');
    return compressedData;
  }
}