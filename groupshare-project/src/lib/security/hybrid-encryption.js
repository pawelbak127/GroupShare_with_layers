import crypto from 'crypto';

/**
 * Funkcje do hybrydowego szyfrowania (AES + RSA/ECC)
 */

// Funkcja do szyfrowania danych hybrydowo
export async function encryptHybrid(data, publicKeyPem) {
  // Generowanie losowego klucza AES-256
  const aesKey = crypto.randomBytes(32);
  
  // Szyfrowanie danych za pomocą AES-GCM
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  // Szyfrowanie klucza AES za pomocą RSA-OAEP
  const encryptedAesKey = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    aesKey
  ).toString('base64');
  
  // Zwracanie zaszyfrowanych danych i klucza
  return {
    encryptedData: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encryptedKey: encryptedAesKey
  };
}

// Funkcja do deszyfrowania danych
export async function decryptHybrid(encryptedPackage, privateKeyPem) {
  // Deszyfrowanie klucza AES za pomocą RSA-OAEP
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedPackage.encryptedKey, 'base64')
  );
  
  // Deszyfrowanie danych za pomocą AES-GCM
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm', 
    aesKey, 
    Buffer.from(encryptedPackage.iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'base64'));
  
  let decrypted = decipher.update(
    encryptedPackage.encryptedData, 
    'base64', 
    'utf8'
  );
  decrypted += decipher.final('utf8');
  
  return decrypted;
}