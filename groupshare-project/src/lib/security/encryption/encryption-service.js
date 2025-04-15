import crypto from 'crypto';

/**
 * Serwis szyfrowania do bezpiecznego zarządzania danymi dostępowymi
 * Implementacja wykorzystująca AES-256-GCM dla lepszego bezpieczeństwa
 */
export class EncryptionService {
  /**
   * Inicjalizuje serwis szyfrowania
   * @param {string} masterKey - Główny klucz szyfrowania (32 bajty jako hex)
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(masterKey, options = {}) {
    if (!masterKey) {
      throw new Error('Master key is required for encryption service');
    }
    
    // Konwertuj klucz hex na bufor
    this.masterKey = Buffer.from(masterKey, 'hex');
    
    // Sprawdź długość klucza (AES-256 wymaga 32 bajtów)
    if (this.masterKey.length !== 32) {
      throw new Error('Master key must be 32 bytes (64 hex characters) for AES-256');
    }
    
    this.algorithm = options.algorithm || 'aes-256-gcm';
    this.version = '2.0'; // Wersja formatu szyfrowania
  }
  
  /**
   * Szyfruje dane
   * @param {string} data - Dane do zaszyfrowania
   * @param {Buffer} aad - Dodatkowe dane uwierzytelniające (opcjonalne)
   * @returns {Object} - Obiekt z zaszyfrowanymi danymi i metadanymi
   */
  encrypt(data, aad = null) {
    if (!data) {
      throw new Error('Data is required for encryption');
    }
    
    try {
      // Generuj losowy wektor inicjalizacyjny (IV)
      const iv = crypto.randomBytes(16);
      
      // Utwórz szyfr AES-256-GCM
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      
      // Dodaj AAD jeśli dostarczone (dodatkowe dane uwierzytelniające)
      if (aad) {
        cipher.setAAD(aad);
      }
      
      // Zaszyfruj dane
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Pobierz tag uwierzytelniania
      const authTag = cipher.getAuthTag();
      
      // Zwróć kompletny pakiet zaszyfrowanych danych
      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.algorithm,
        version: this.version,
        hasAAD: !!aad
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Deszyfruje dane
   * @param {Object} encryptedPackage - Pakiet zaszyfrowanych danych
   * @param {Buffer} aad - Dodatkowe dane uwierzytelniające (opcjonalne)
   * @returns {string} - Odszyfrowane dane
   */
  decrypt(encryptedPackage, aad = null) {
    if (!encryptedPackage || !encryptedPackage.encryptedData) {
      throw new Error('Encrypted data package is required for decryption');
    }
    
    try {
      // Obsługa różnych wersji formatu szyfrowania
      if (encryptedPackage.version && encryptedPackage.version !== this.version) {
        // Implementacja obsługi starszych formatów szyfrowania
        return this.decryptLegacy(encryptedPackage);
      }
      
      // Utwórz deszyfrator
      const decipher = crypto.createDecipheriv(
        encryptedPackage.algorithm || this.algorithm,
        this.masterKey,
        Buffer.from(encryptedPackage.iv, 'base64')
      );
      
      // Ustaw tag uwierzytelniania
      decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'base64'));
      
      // Dodaj AAD jeśli było używane
      if (encryptedPackage.hasAAD && aad) {
        decipher.setAAD(aad);
      }
      
      // Deszyfruj dane
      let decrypted = decipher.update(encryptedPackage.encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      
      // Bardziej opisowe komunikaty błędów
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Authentication failed: the data may have been tampered with');
      } else if (error.message.includes('bad decrypt')) {
        throw new Error('Decryption failed: invalid key or corrupted data');
      } else {
        throw new Error(`Failed to decrypt data: ${error.message}`);
      }
    }
  }
  
  /**
   * Deszyfruje dane w starszym formacie
   * @param {Object} encryptedPackage - Pakiet zaszyfrowanych danych
   * @returns {string} - Odszyfrowane dane
   */
  decryptLegacy(encryptedPackage) {
    // Obsługa formatu v1.0 (bez AAD, starsza implementacja)
    if (encryptedPackage.version === '1.0') {
      try {
        // Starsza implementacja mogła używać IV w innym formacie
        const iv = Buffer.from(encryptedPackage.iv, 'base64');
        
        // Utwórz deszyfrator dla starego formatu
        const decipher = crypto.createDecipheriv(
          encryptedPackage.algorithm || 'aes-256-gcm',
          this.masterKey,
          iv
        );
        
        // Ustaw tag uwierzytelniania (mógł być zapisany w innym formacie)
        decipher.setAuthTag(Buffer.from(encryptedPackage.authTag || encryptedPackage.tag, 'base64'));
        
        // Deszyfruj dane
        let decrypted = decipher.update(encryptedPackage.encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      } catch (error) {
        console.error('Legacy decryption error:', error);
        throw new Error('Failed to decrypt legacy data format');
      }
    }
    
    // Nieznany format
    throw new Error(`Unsupported encryption format version: ${encryptedPackage.version}`);
  }
  
  /**
   * Szyfruje instrukcje dostępowe dla oferty
   * @param {string} instructions - Instrukcje do zaszyfrowania
   * @param {string} groupSubId - ID oferty (do AAD)
   * @returns {Object} - Zaszyfrowany pakiet
   */
  encryptAccessInstructions(instructions, groupSubId) {
    if (!instructions) {
      throw new Error('Instructions content is required');
    }
    
    if (!groupSubId) {
      throw new Error('Group subscription ID is required for context');
    }
    
    // Przygotuj AAD (dodatkowe dane uwierzytelniające) z ID oferty
    // AAD nie jest szyfrowane, ale zapewnia integralność kontekstu
    const aad = Buffer.from(groupSubId);
    
    // Zaszyfruj instrukcje z AAD
    const encryptedPackage = this.encrypt(instructions, aad);
    
    // Dodaj metadane
    return {
      ...encryptedPackage,
      groupSubId,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Deszyfruje instrukcje dostępowe
   * @param {Object} encryptedPackage - Zaszyfrowany pakiet
   * @param {string} expectedGroupSubId - Oczekiwane ID oferty do weryfikacji
   * @returns {string} - Odszyfrowane instrukcje
   */
  decryptAccessInstructions(encryptedPackage, expectedGroupSubId) {
    if (!encryptedPackage) {
      throw new Error('Encrypted package is required');
    }
    
    if (!expectedGroupSubId) {
      throw new Error('Expected group subscription ID is required for verification');
    }
    
    // Sprawdź, czy pakiet zawiera prawidłowe ID oferty
    if (encryptedPackage.groupSubId !== expectedGroupSubId) {
      throw new Error('Security context mismatch: incorrect group subscription ID');
    }
    
    // Przygotuj AAD dla weryfikacji
    const aad = Buffer.from(expectedGroupSubId);
    
    // Deszyfruj instrukcje z weryfikacją AAD
    return this.decrypt(encryptedPackage, aad);
  }
  
  /**
   * Format współczesny: szyfruje dane używając simple API
   * Dla prostszych przypadków użycia
   * @param {string} data - Dane do zaszyfrowania
   * @returns {string} - Zaszyfrowane dane w formacie string (JSON)
   */
  encryptToString(data) {
    const encryptedPackage = this.encrypt(data);
    return JSON.stringify(encryptedPackage);
  }
  
  /**
   * Deszyfruje dane z formatu string
   * @param {string} encryptedString - Zaszyfrowane dane w formacie string (JSON)
   * @returns {string} - Odszyfrowane dane
   */
  decryptFromString(encryptedString) {
    const encryptedPackage = JSON.parse(encryptedString);
    return this.decrypt(encryptedPackage);
  }
}

// Funkcja pomocnicza do generowania bezpiecznego klucza głównego
export function generateMasterKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Fallback - uproszczone szyfrowanie dla kompatybilności wstecznej
// Dla zachowania kompatybilności ze starszym kodem
export function simpleEncrypt(data, key) {
  if (!key) {
    throw new Error('Encryption key is required');
  }
  
  // Derive 32-byte key from the provided key using PBKDF2
  const derivedKey = crypto.pbkdf2Sync(
    key,
    'salt', // A static salt, in production use a more secure salt
    1000,   // Iterations, higher is more secure but slower
    32,     // Key length in bytes
    'sha256'
  );
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

export function simpleDecrypt(encryptedPackage, key) {
  if (!key) {
    throw new Error('Decryption key is required');
  }
  
  // Derive the same key using the same parameters
  const derivedKey = crypto.pbkdf2Sync(
    key,
    'salt',
    1000,
    32,
    'sha256'
  );
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    derivedKey,
    Buffer.from(encryptedPackage.iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'base64'));
  
  let decrypted = decipher.update(encryptedPackage.encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}