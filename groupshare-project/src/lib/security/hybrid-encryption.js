import crypto from 'crypto';

/**
 * Moduł do hybrydowego szyfrowania (AES + RSA/ECC)
 * Wzmocniona implementacja z obsługą dodatkowych danych uwierzytelniających (AAD)
 */

/**
 * Szyfruje dane za pomocą hybrydowego podejścia (klucz sesji + szyfrowanie asymetryczne)
 * @param {string} data - Dane do zaszyfrowania
 * @param {string} publicKeyPem - Klucz publiczny PEM
 * @param {Buffer} aad - Dodatkowe dane uwierzytelniające (opcjonalne)
 * @returns {Promise<Object>} - Obiekt z danymi zaszyfrowanymi
 */
export async function encryptHybrid(data, publicKeyPem, aad = null) {
  try {
    // 1. Generowanie losowego klucza AES-256 (klucz sesji)
    const aesKey = crypto.randomBytes(32);
    
    // 2. Generowanie losowego IV dla AES-GCM
    const iv = crypto.randomBytes(16);
    
    // 3. Utworzenie szyfru AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    
    // 4. Dodanie AAD jeśli dostarczone
    if (aad) {
      cipher.setAAD(aad);
    }
    
    // 5. Szyfrowanie danych za pomocą AES-GCM
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // 6. Pobranie tagu uwierzytelniania
    const authTag = cipher.getAuthTag();
    
    // 7. Szyfrowanie klucza AES za pomocą RSA-OAEP lub ECIES
    let encryptedAesKey;
    
    if (publicKeyPem.includes('BEGIN EC PUBLIC KEY')) {
      // Szyfrowanie ECIES (implementacja uproszczona)
      encryptedAesKey = encryptWithECIES(aesKey, publicKeyPem);
    } else {
      // Standardowe szyfrowanie RSA-OAEP
      encryptedAesKey = crypto.publicEncrypt(
        {
          key: publicKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        aesKey
      ).toString('base64');
    }
    
    // 8. Zwróć kompletny pakiet zaszyfrowanych danych
    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedKey: encryptedAesKey,
      algorithm: 'AES-256-GCM',
      keyEncryption: publicKeyPem.includes('BEGIN EC PUBLIC KEY') ? 'ECIES' : 'RSA-OAEP'
    };
  } catch (error) {
    console.error('Hybrid encryption error:', error);
    throw new Error('Failed to encrypt data with hybrid encryption');
  }
}

/**
 * Deszyfruje dane zaszyfrowane metodą hybrydową
 * @param {Object} encryptedPackage - Pakiet z zaszyfrowanymi danymi
 * @param {string} privateKeyPem - Klucz prywatny PEM
 * @param {Buffer} aad - Dodatkowe dane uwierzytelniające (opcjonalne)
 * @returns {Promise<string>} - Odszyfrowane dane
 */
export async function decryptHybrid(encryptedPackage, privateKeyPem, aad = null) {
  try {
    let aesKey;
    
    // 1. Sprawdź typ klucza prywatnego (RSA czy EC)
    if (privateKeyPem.includes('BEGIN EC PRIVATE KEY')) {
      // Deszyfrowanie ECIES
      aesKey = decryptWithECIES(
        Buffer.from(encryptedPackage.encryptedKey, 'base64'),
        privateKeyPem
      );
    } else {
      // 2. Deszyfrowanie klucza AES za pomocą RSA-OAEP
      aesKey = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encryptedPackage.encryptedKey, 'base64')
      );
    }
    
    // 3. Utworzenie deszyfratora AES-GCM
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm', 
      aesKey, 
      Buffer.from(encryptedPackage.iv, 'base64')
    );
    
    // 4. Ustawienie tagu uwierzytelniania
    decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'base64'));
    
    // 5. Dodanie AAD jeśli dostarczone
    if (aad) {
      decipher.setAAD(aad);
    }
    
    // 6. Deszyfrowanie danych
    let decrypted = decipher.update(
      encryptedPackage.encryptedData, 
      'base64', 
      'utf8'
    );
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Stwórz bardziej opisowy błąd bazując na typie błędu
    if (error.message.includes('bad decrypt')) {
      throw new Error('Decryption failed: the key or encrypted data may be invalid');
    } else if (error.message.includes('tag')) {
      throw new Error('Authentication failed: the data may have been tampered with');
    } else {
      console.error('Hybrid decryption error:', error);
      throw new Error('Failed to decrypt data with hybrid encryption');
    }
  }
}

/**
 * Szyfruje dane za pomocą ECIES (Elliptic Curve Integrated Encryption Scheme)
 * Uwaga: Jest to uproszczona implementacja, w produkcji należy użyć dedykowanej biblioteki ECIES
 * @param {Buffer} data - Dane do zaszyfrowania
 * @param {string} publicKeyPem - Klucz publiczny EC
 * @returns {string} - Zaszyfrowane dane w formacie base64
 */
function encryptWithECIES(data, publicKeyPem) {
  // Implementacja zastępcza - w rzeczywistości używałaby specjalizowanej biblioteki ECIES
  // Ta implementacja jest uproszczona dla celów ilustracyjnych
  console.warn('Using simplified ECIES implementation - in production use a dedicated ECIES library');
  
  // Używamy RSA jako tymczasowe zastępstwo (NIE ROBIĆ TEGO W PRODUKCJI)
  // W produkcji używamy dedykowanych bibliotek ECIES
  return crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    data
  ).toString('base64');
}

/**
 * Deszyfruje dane zaszyfrowane za pomocą ECIES
 * Uwaga: Jest to uproszczona implementacja, w produkcji należy użyć dedykowanej biblioteki ECIES
 * @param {Buffer} encryptedData - Zaszyfrowane dane
 * @param {string} privateKeyPem - Klucz prywatny EC
 * @returns {Buffer} - Odszyfrowane dane
 */
function decryptWithECIES(encryptedData, privateKeyPem) {
  // Implementacja zastępcza - w rzeczywistości używałaby specjalizowanej biblioteki ECIES
  console.warn('Using simplified ECIES implementation - in production use a dedicated ECIES library');
  
  // Używamy RSA jako tymczasowe zastępstwo (NIE ROBIĆ TEGO W PRODUKCJI)
  // W produkcji używamy dedykowanych bibliotek ECIES
  return crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    encryptedData
  );
}

/**
 * Generuje podpis cyfrowy dla danych używając klucza prywatnego
 * @param {string} data - Dane do podpisania
 * @param {string} privateKeyPem - Klucz prywatny PEM
 * @returns {string} - Podpis w formacie base64
 */
export function signData(data, privateKeyPem) {
  try {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    
    const signature = sign.sign(privateKeyPem, 'base64');
    return signature;
  } catch (error) {
    console.error('Digital signature error:', error);
    throw new Error('Failed to create digital signature');
  }
}

/**
 * Weryfikuje podpis cyfrowy używając klucza publicznego
 * @param {string} data - Dane które zostały podpisane
 * @param {string} signature - Podpis w formacie base64
 * @param {string} publicKeyPem - Klucz publiczny PEM
 * @returns {boolean} - Czy podpis jest ważny
 */
export function verifySignature(data, signature, publicKeyPem) {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    
    return verify.verify(publicKeyPem, signature, 'base64');
  } catch (error) {
    console.error('Signature verification error:', error);
    throw new Error('Failed to verify digital signature');
  }
}