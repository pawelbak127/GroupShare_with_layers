import { generateRsaKeyPair, generateEccKeyPair } from './key-generation';
import crypto from 'crypto';
import supabase from '../database/supabase-client';

/**
 * Serwis zarządzania kluczami kryptograficznymi
 * Wzmocniona implementacja z lepszymi praktykami bezpieczeństwa
 */
export class KeyManagementService {
  /**
   * Inicjalizuje serwis zarządzania kluczami
   * @param {string} masterKey - Klucz główny do szyfrowania kluczy prywatnych
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.algorithm - Algorytm szyfrowania (aes-256-gcm)
   * @param {boolean} options.useHsm - Czy używać HSM (Hardware Security Module)
   */
  constructor(masterKey, options = {}) {
    if (!masterKey) {
      throw new Error('Master key is required for key management');
    }
    
    this.masterKey = Buffer.from(masterKey, 'hex');
    this.algorithm = options.algorithm || 'aes-256-gcm';
    this.useHsm = options.useHsm || false;
    
    // Validate master key length (for AES-256 it must be 32 bytes)
    if (this.masterKey.length !== 32 && !this.useHsm) {
      throw new Error('Master key must be 32 bytes (64 hex characters) for AES-256');
    }
  }
  
  /**
   * Generuje nową parę kluczy i zapisuje ją w bazie danych
   * @param {string} keyType - Typ klucza (np. 'group', 'user')
   * @param {string} relatedId - ID powiązanego obiektu
   * @param {string} algorithm - Algorytm kryptograficzny ('rsa' lub 'ec')
   * @returns {Promise<string>} - ID wygenerowanego klucza
   */
  async generateKeyPair(keyType, relatedId = null, algorithm = 'rsa') {
    try {
      let keyPair;
      
      // Jeśli używamy HSM, użyj go do generowania kluczy
      if (this.useHsm) {
        keyPair = await this.generateKeyPairWithHsm(algorithm);
      } else {
        // W przeciwnym razie użyj standardowych funkcji kryptograficznych
        keyPair = algorithm === 'rsa' 
          ? await generateRsaKeyPair(2048)
          : await generateEccKeyPair('prime256v1');
      }
      
      // Szyfrowanie klucza prywatnego
      const encryptedPrivateKey = await this.encryptPrivateKey(
        keyPair.privateKey
      );
      
      // Zapisanie pary kluczy w bazie danych
      const { data, error } = await supabase
        .from('encryption_keys')
        .insert({
          key_type: keyType,
          public_key: keyPair.publicKey,
          private_key_enc: JSON.stringify(encryptedPrivateKey),
          related_id: relatedId,
          active: true,
          created_at: new Date().toISOString(),
          rotated_at: null,
          expires_at: this.calculateKeyExpiry(keyType)
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      return data.id;
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw new Error('Failed to generate key pair');
    }
  }
  
  /**
   * Generuje parę kluczy za pomocą HSM (zaślepka - w produkcji używałaby prawdziwego HSM)
   * @param {string} algorithm - Algorytm kryptograficzny
   * @returns {Promise<Object>} - Para kluczy
   */
  async generateKeyPairWithHsm(algorithm) {
    // W rzeczywistej implementacji używałaby specjalnego API HSM
    console.warn('HSM generation is not implemented, falling back to software generation');
    
    // Fallback do generowania programowego
    return algorithm === 'rsa' 
      ? await generateRsaKeyPair(2048)
      : await generateEccKeyPair('prime256v1');
  }
  
  /**
   * Oblicza datę wygaśnięcia klucza na podstawie jego typu
   * @param {string} keyType - Typ klucza
   * @returns {string} - Data wygaśnięcia w ISO format
   */
  calculateKeyExpiry(keyType) {
    const expiryMap = {
      'group': 365, // dni
      'user': 180,
      'session': 30,
      'master': 730,
      'default': 365
    };
    
    const days = expiryMap[keyType] || expiryMap.default;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    return expiryDate.toISOString();
  }
  
  /**
   * Szyfruje klucz prywatny za pomocą klucza głównego
   * @param {string} privateKeyPem - Klucz prywatny w formacie PEM
   * @returns {Object} - Obiekt z zaszyfrowanymi danymi
   */
  async encryptPrivateKey(privateKeyPem) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
    
    let encryptedKey = cipher.update(privateKeyPem, 'utf8', 'base64');
    encryptedKey += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedKey,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.algorithm,
      version: '2.0' // Wersja formatu szyfrowania
    };
  }
  
  /**
   * Deszyfruje klucz prywatny za pomocą klucza głównego
   * @param {Object} encryptedData - Obiekt z zaszyfrowanymi danymi
   * @returns {string} - Deszyfrowany klucz prywatny
   */
  async decryptPrivateKey(encryptedData) {
    if (encryptedData.version !== '2.0') {
      // Obsługa starszych formatów szyfrowania dla kompatybilności wstecznej
      return this.decryptPrivateKeyLegacy(encryptedData);
    }
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.masterKey,
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    let privateKey = decipher.update(encryptedData.encryptedKey, 'base64', 'utf8');
    privateKey += decipher.final('utf8');
    
    return privateKey;
  }
  
  /**
   * Deszyfruje klucz prywatny w starszym formacie
   * @param {Object} encryptedData - Obiekt z zaszyfrowanymi danymi
   * @returns {string} - Deszyfrowany klucz prywatny
   */
  async decryptPrivateKeyLegacy(encryptedData) {
    // Obsługa starszego formatu (wersja 1.0)
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm', // Starszy algorytm
      this.masterKey,
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    let privateKey = decipher.update(encryptedData.encryptedKey, 'base64', 'utf8');
    privateKey += decipher.final('utf8');
    
    return privateKey;
  }
  
  /**
   * Pobiera klucz publiczny
   * @param {string} keyId - ID klucza
   * @returns {Promise<string>} - Klucz publiczny
   */
  async getPublicKey(keyId) {
    try {
      const { data, error } = await supabase
        .from('encryption_keys')
        .select('public_key')
        .eq('id', keyId)
        .eq('active', true)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Key not found');
      
      return data.public_key;
    } catch (error) {
      console.error('Error getting public key:', error);
      throw new Error('Failed to get public key');
    }
  }
  
  /**
   * Pobiera i deszyfruje klucz prywatny
   * @param {string} keyId - ID klucza
   * @returns {Promise<string>} - Deszyfrowany klucz prywatny
   */
  async getPrivateKey(keyId) {
    try {
      const { data, error } = await supabase
        .from('encryption_keys')
        .select('private_key_enc, expires_at')
        .eq('id', keyId)
        .eq('active', true)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Key not found');
      
      // Sprawdź, czy klucz nie wygasł
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Key has expired');
      }
      
      const encryptedData = JSON.parse(data.private_key_enc);
      return await this.decryptPrivateKey(encryptedData);
    } catch (error) {
      console.error('Error getting private key:', error);
      throw new Error('Failed to get private key');
    }
  }
  
  /**
   * Rotacja kluczy - tworzy nowy klucz i oznacza stary jako nieaktywny
   * @param {string} keyId - ID klucza do rotacji
   * @returns {Promise<string>} - ID nowego klucza
   */
  async rotateKey(keyId) {
    try {
      // 1. Pobierz dane starego klucza
      const { data: oldKey, error: fetchError } = await supabase
        .from('encryption_keys')
        .select('*')
        .eq('id', keyId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // 2. Określ typ algorytmu
      const algorithm = oldKey.public_key.includes('BEGIN RSA PUBLIC KEY') ? 'rsa' : 'ec';
      
      // 3. Generuj nową parę kluczy
      const newKeyId = await this.generateKeyPair(
        oldKey.key_type,
        oldKey.related_id,
        algorithm
      );
      
      // 4. Oznacz stary klucz jako nieaktywny
      const currentDate = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('encryption_keys')
        .update({ 
          active: false, 
          rotated_at: currentDate
        })
        .eq('id', keyId);
      
      if (updateError) throw updateError;
      
      // 5. Zwróć ID nowego klucza
      return newKeyId;
    } catch (error) {
      console.error('Error rotating key:', error);
      throw new Error('Failed to rotate key');
    }
  }
  
  /**
   * Sprawdza, czy klucze wymagają rotacji
   * @param {string} keyType - Typ klucza do sprawdzenia
   * @param {number} daysBeforeExpiry - Liczba dni przed wygaśnięciem do rotacji
   * @returns {Promise<Array>} - Lista kluczy do rotacji
   */
  async getKeysRequiringRotation(keyType = null, daysBeforeExpiry = 30) {
    try {
      // Oblicz datę, przed którą klucze powinny być zrotowane
      const rotationThreshold = new Date();
      rotationThreshold.setDate(rotationThreshold.getDate() + daysBeforeExpiry);
      
      // Przygotuj zapytanie
      let query = supabase
        .from('encryption_keys')
        .select('id, key_type, related_id, expires_at')
        .eq('active', true)
        .lt('expires_at', rotationThreshold.toISOString());
      
      // Dodaj filtr po typie, jeśli podano
      if (keyType) {
        query = query.eq('key_type', keyType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error checking keys for rotation:', error);
      throw new Error('Failed to check keys for rotation');
    }
  }
}