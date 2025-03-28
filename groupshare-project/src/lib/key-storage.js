// Funkcja do szyfrowania klucza prywatnego przed zapisem
export async function encryptPrivateKey(privateKeyPem, masterKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    let encryptedKey = cipher.update(privateKeyPem, 'utf8', 'base64');
    encryptedKey += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedKey,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }
  
  // Funkcja do deszyfrowania klucza prywatnego
  export async function decryptPrivateKey(encryptedData, masterKey) {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      masterKey,
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    let privateKey = decipher.update(encryptedData.encryptedKey, 'base64', 'utf8');
    privateKey += decipher.final('utf8');
    
    return privateKey;
  }