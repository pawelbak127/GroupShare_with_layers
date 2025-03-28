import { generateRsaKeyPair, generateEccKeyPair } from './key-generation';
import crypto from 'crypto';
import supabase from '../supabase-client';

/**
 * Serwis zarządzania kluczami kryptograficznymi
 */
export class KeyManagementService {
  constructor(masterKey) {
    this.masterKey = masterKey;
  }
  
  // Generowanie nowej pary kluczy
  async generateKeyPair(keyType, relatedId = null, algorithm = 'rsa') {
    try {
      // Generowanie pary kluczy
      const keyPair = algorithm === 'rsa' 
        ? await generateRsaKeyPair(2048)
        : await generateEccKeyPair('prime256v1');
      
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
          expires_at: null
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
  
  // Szyfrowanie klucza prywatnego
  async encryptPrivateKey(privateKeyPem) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.masterKey), iv);
    let encryptedKey = cipher.update(privateKeyPem, 'utf8', 'base64');
    encryptedKey += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedKey,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }
  
  // Deszyfrowanie klucza prywatnego
  async decryptPrivateKey(encryptedData) {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.masterKey),
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    let privateKey = decipher.update(encryptedData.encryptedKey, 'base64', 'utf8');
    privateKey += decipher.final('utf8');
    
    return privateKey;
  }
  
  // Pobranie klucza publicznego
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
  
  // Pobranie i deszyfrowanie klucza prywatnego
  async getPrivateKey(keyId) {
    try {
      const { data, error } = await supabase
        .from('encryption_keys')
        .select('private_key_enc')
        .eq('id', keyId)
        .eq('active', true)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Key not found');
      
      const encryptedData = JSON.parse(data.private_key_enc);
      return await this.decryptPrivateKey(encryptedData);
    } catch (error) {
      console.error('Error getting private key:', error);
      throw new Error('Failed to get private key');
    }
  }
  
  // Rotacja kluczy
  async rotateKey(keyId) {
    try {
      // 1. Pobranie starego klucza
      const { data: oldKey, error: fetchError } = await supabase
        .from('encryption_keys')
        .select('*')
        .eq('id', keyId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // 2. Generowanie nowej pary kluczy
      const algorithm = oldKey.public_key.includes('BEGIN RSA PUBLIC KEY') ? 'rsa' : 'ec';
      const keyPair = algorithm === 'rsa'
        ? await generateRsaKeyPair(2048)
        : await generateEccKeyPair('prime256v1');
      
      // 3. Szyfrowanie klucza prywatnego
      const encryptedPrivateKey = await this.encryptPrivateKey(
        keyPair.privateKey
      );
      
      // 4. Oznaczenie starego klucza jako nieaktywnego
      const { error: updateError } = await supabase
        .from('encryption_keys')
        .update({ active: false })
        .eq('id', keyId);
      
      if (updateError) throw updateError;
      
      // 5. Zapisanie nowego klucza
      const { data: newKey, error: insertError } = await supabase
        .from('encryption_keys')
        .insert({
          key_type: oldKey.key_type,
          public_key: keyPair.publicKey,
          private_key_enc: JSON.stringify(encryptedPrivateKey),
          related_id: oldKey.related_id,
          active: true,
          created_at: new Date().toISOString(),
          rotated_at: null,
          expires_at: null
        })
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      
      return newKey.id;
    } catch (error) {
      console.error('Error rotating key:', error);
      throw new Error('Failed to rotate key');
    }
  }
}