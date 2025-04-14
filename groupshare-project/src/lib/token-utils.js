// src/lib/token-utils.js
import crypto from 'crypto';
import supabaseAdmin from './supabase-admin-client';

/**
 * Tworzy i zapisuje token dostępu dla danego zakupu
 * @param {string} purchaseId - ID zakupu
 * @param {number} expirationMinutes - Czas ważności tokenu w minutach (domyślnie 30)
 * @returns {Promise<{token: string, tokenId: string}>} - Zwraca wygenerowany token i jego ID
 */
export async function createAccessToken(purchaseId, expirationMinutes = 30) {
  try {
    console.log(`Creating access token for purchase ${purchaseId} (expires in ${expirationMinutes} minutes)`);
    
    // Generowanie bezpiecznego tokenu
    const token = crypto.randomBytes(32).toString('hex');
    
    // Obliczanie hash tokenu
    const tokenHash = hashToken(token);
    
    // Obliczanie czasu wygaśnięcia
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
    
    // Zapisanie tokenu w bazie danych
    const { data, error } = await supabaseAdmin
      .from('access_tokens')
      .insert({
        purchase_record_id: purchaseId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating access token:', error);
      throw new Error(`Failed to create access token: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned when creating access token');
    }
    
    console.log(`Created token ${data.id} for purchase ${purchaseId}`);
    
    // Logowanie w security_logs
    try {
      await supabaseAdmin
        .from('security_logs')
        .insert({
          action_type: 'token_created',
          resource_type: 'access_token',
          resource_id: data.id,
          status: 'success',
          details: {
            purchase_id: purchaseId,
            expires_at: expiresAt.toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Error logging token creation:', logError);
      // Kontynuujemy mimo błędu
    }
    
    return { token, tokenId: data.id };
  } catch (error) {
    console.error('Exception in createAccessToken:', error);
    throw error;
  }
}

/**
 * Weryfikuje token dostępu
 * @param {string} token - Token do weryfikacji
 * @param {string} purchaseId - ID zakupu
 * @returns {Promise<{valid: boolean, tokenData: object|null, reason: string|null}>}
 */
export async function verifyAccessToken(token, purchaseId) {
  try {
    console.log(`Verifying access token for purchase ${purchaseId}`);
    
    // Obliczanie hash tokenu
    const tokenHash = hashToken(token);
    
    // Sprawdzenie, czy token istnieje
    const { data, error } = await supabaseAdmin
      .from('access_tokens')
      .select('*')
      .eq('purchase_record_id', purchaseId)
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      // Jeśli nie znaleziono tokenu, sprawdź dlaczego
      if (error.code === 'PGRST116') {
        // Sprawdź, czy token istnieje, ale jest już użyty lub wygasł
        const { data: expiredToken } = await supabaseAdmin
          .from('access_tokens')
          .select('*')
          .eq('purchase_record_id', purchaseId)
          .eq('token_hash', tokenHash)
          .maybeSingle();
        
        if (expiredToken) {
          if (expiredToken.used) {
            return { valid: false, tokenData: null, reason: 'Token already used' };
          }
          
          if (new Date(expiredToken.expires_at) <= new Date()) {
            return { valid: false, tokenData: null, reason: 'Token expired' };
          }
        }
        
        return { valid: false, tokenData: null, reason: 'Token not found' };
      }
      
      console.error('Error verifying access token:', error);
      return { valid: false, tokenData: null, reason: `Database error: ${error.message}` };
    }
    
    return { valid: true, tokenData: data, reason: null };
  } catch (error) {
    console.error('Exception in verifyAccessToken:', error);
    return { valid: false, tokenData: null, reason: `Exception: ${error.message}` };
  }
}

/**
 * Oznacza token jako użyty
 * @param {string} tokenId - ID tokenu
 * @param {object} metadata - Metadane do zapisania (IP, User Agent)
 * @returns {Promise<boolean>}
 */
export async function markTokenAsUsed(tokenId, metadata = {}) {
  try {
    console.log(`Marking token ${tokenId} as used`);
    
    const { error } = await supabaseAdmin
      .from('access_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString(),
        ip_address: metadata.ip || null,
        user_agent: metadata.userAgent || null
      })
      .eq('id', tokenId);
    
    if (error) {
      console.error('Error marking token as used:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in markTokenAsUsed:', error);
    return false;
  }
}

/**
 * Funkcja tworząca hash tokenu
 * @param {string} token - Token do zahashowania
 * @returns {string} - Hash tokenu
 */
export function hashToken(token) {
  // Używamy stałej soli dla wszystkich środowisk, aby zapewnić spójność
  // W produkcji powinna być pobierana z zmiennych środowiskowych
  const salt = process.env.TOKEN_SALT || 'default-salt-for-tokens';
  
  return crypto
    .createHash('sha256')
    .update(token + salt)
    .digest('hex');
}