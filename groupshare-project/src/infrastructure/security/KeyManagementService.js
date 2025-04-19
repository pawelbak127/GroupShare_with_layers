// /src/infrastructure/security/key-management/KeyManagementAdapter.js

import crypto from 'crypto';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { ApplicationException } from '@/application/exceptions';

/**
 * Adapter zarządzania kluczami kryptograficznymi
 * Implementuje interfejs IKeyManagementService z warstwy aplikacji
 */
export class KeyManagementAdapter {
  /**
   * Inicjalizuje adapter zarządzania kluczami
   * @param {string} masterKey - Klucz główny do szyfrowania kluczy prywatnych
   * @param {Object} options - Opcje konfiguracyjne
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
          ? await this.generateRsaKeyPair(2048)
          : await this.generateEccKeyPair('prime256v1');
      }
      
      // Szyfrowanie klucza prywatnego
      const encryptedPrivateKey = await this.encryptPrivateKey(
        keyPair.privateKey
      );
      
      // Zapisanie pary kluczy w bazie danych
      const { data, error } = await supabaseAdmin
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
      throw new ApplicationException('Failed to generate key pair', 'ENCRYPTION_ERROR');
    }
  }
  
  /**
   * Generuje parę kluczy RSA
   * @param {number} modulusLength - Długość modułu (np. 2048, 4096)
   * @returns {Promise<Object>} - Para kluczy { publicKey, privateKey }
   * @private
   */
  generateRsaKeyPair(modulusLength = 2048) {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('rsa', {
        modulusLength,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({ publicKey, privateKey });
      });
    });
  }
  
  /**
   * Generuje parę kluczy ECC
   * @param {string} namedCurve - Nazwa krzywej (np. 'prime256v1')
   * @returns {Promise<Object>} - Para kluczy { publicKey, privateKey }
   * @private
   */
  generateEccKeyPair(namedCurve = 'prime256v1') {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('ec', {
        namedCurve,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({ publicKey, privateKey });
      });
    });
  }
  
  /**
   * Generuje parę kluczy za pomocą HSM (symulacja - w produkcji używałaby prawdziwego HSM)
   * @param {string} algorithm - Algorytm kryptograficzny
   * @returns {Promise<Object>} - Para kluczy
   * @private
   */
  async generateKeyPairWithHsm(algorithm) {
    // W rzeczywistej implementacji używałaby specjalnego API HSM
    console.warn('HSM generation is not implemented, falling back to software generation');
    
    // Fallback do generowania programowego
    return algorithm === 'rsa' 
      ? await this.generateRsaKeyPair(2048)
      : await this.generateEccKeyPair('prime256v1');
  }
  
  /**
   * Oblicza datę wygaśnięcia klucza na podstawie jego typu
   * @param {string} keyType - Typ klucza
   * @returns {string} - Data wygaśnięcia w ISO format
   * @private
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
   * @private
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
   * @private
   */
  async decryptPrivateKey(encryptedData) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        Buffer.from(encryptedData.iv, 'base64')
      );
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
      
      let privateKey = decipher.update(encryptedData.encryptedKey, 'base64', 'utf8');
      privateKey += decipher.final('utf8');
      
      return privateKey;
    } catch (error) {
      console.error('Error decrypting private key:', error);
      throw new ApplicationException('Failed to decrypt private key', 'ENCRYPTION_ERROR');
    }
  }
  
  /**
   * Pobiera klucz publiczny
   * @param {string} keyId - ID klucza
   * @returns {Promise<string>} - Klucz publiczny
   */
  async getPublicKey(keyId) {
    try {
      const { data, error } = await supabaseAdmin
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
      throw new ApplicationException('Failed to get public key', 'ENCRYPTION_ERROR');
    }
  }
  
  /**
   * Pobiera i deszyfruje klucz prywatny
   * @param {string} keyId - ID klucza
   * @returns {Promise<string>} - Deszyfrowany klucz prywatny
   */
  async getPrivateKey(keyId) {
    try {
      const { data, error } = await supabaseAdmin
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
      throw new ApplicationException('Failed to get private key', 'ENCRYPTION_ERROR');
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
      const { data: oldKey, error: fetchError } = await supabaseAdmin
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
      const { error: updateError } = await supabaseAdmin
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
      throw new ApplicationException('Failed to rotate key', 'ENCRYPTION_ERROR');
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
      let query = supabaseAdmin
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
      throw new ApplicationException('Failed to check keys for rotation', 'ENCRYPTION_ERROR');
    }
  }
}

export default KeyManagementAdapter;