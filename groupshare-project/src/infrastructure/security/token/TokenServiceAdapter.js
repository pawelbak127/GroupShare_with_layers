// /src/infrastructure/security/token/TokenServiceAdapter.js

import crypto from 'crypto';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { ApplicationException, TokenException } from '@/application/exceptions';
import { Id } from '@/domain/shared/value-objects/Id';

/**
 * Adapter dla usługi tokenów dostępowych
 * Implementuje interfejs z warstwy aplikacji dla mechanizmu tokenów
 */
export class TokenServiceAdapter {
  /**
   * Inicjalizuje adapter
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(options = {}) {
    this.tokenSalt = options.tokenSalt || process.env.TOKEN_SALT || 'default-salt';
    this.options = {
      defaultExpiryMinutes: 30,
      tokenLength: 32,
      ...options
    };
  }
  
  /**
   * Generuje nowy token dostępu
   * @param {string} purchaseId ID zakupu
   * @param {number} expiryMinutes Czas ważności w minutach
   * @returns {Promise<Object>} Dane tokenu
   */
  async generateAccessToken(purchaseId, expiryMinutes = null) {
    try {
      if (!purchaseId) {
        throw new Error('Purchase ID is required');
      }
      
      // Ustaw czas wygaśnięcia
      const expiry = expiryMinutes || this.options.defaultExpiryMinutes;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiry);
      
      // Wygeneruj token
      const tokenValue = crypto.randomBytes(this.options.tokenLength).toString('hex');
      const tokenHash = this.hashToken(tokenValue);
      
      // Zapisz token w bazie danych
      const tokenId = Id.create().toString();
      const tokenData = {
        id: tokenId,
        purchase_record_id: purchaseId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabaseAdmin
        .from('access_tokens')
        .insert([tokenData]);
      
      if (error) throw error;
      
      // Zwróć dane tokenu
      return {
        token: tokenValue,
        expiresAt: expiresAt.toISOString(),
        tokenId
      };
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new ApplicationException('Failed to generate access token', 'TOKEN_ERROR');
    }
  }
  
  /**
   * Weryfikuje token dostępu
   * @param {string} purchaseId ID zakupu
   * @param {string} tokenValue Wartość tokenu
   * @returns {Promise<Object>} Zweryfikowany token
   * @throws {TokenException} W przypadku błędu
   */
  async verifyAccessToken(purchaseId, tokenValue) {
    try {
      if (!purchaseId || !tokenValue) {
        throw new TokenException('Invalid token parameters', null);
      }
      
      // Oblicz hash tokenu
      const tokenHash = this.hashToken(tokenValue);
      
      // Znajdź token
      const { data, error } = await supabaseAdmin
        .from('access_tokens')
        .select('*')
        .eq('purchase_record_id', purchaseId)
        .eq('token_hash', tokenHash)
        .single();
      
      if (error || !data) {
        throw new TokenException('Invalid token', null);
      }
      
      // Sprawdź czy token nie wygasł
      if (new Date(data.expires_at) < new Date()) {
        throw new TokenException('Token expired', data.id);
      }
      
      // Sprawdź czy token nie został już użyty
      if (data.used) {
        throw new TokenException('Token already used', data.id);
      }
      
      return {
        id: data.id,
        purchaseId: data.purchase_record_id,
        expiresAt: data.expires_at,
        used: data.used
      };
    } catch (error) {
      // Jeśli to już jest TokenException, przekaż dalej
      if (error instanceof TokenException) {
        throw error;
      }
      
      console.error('Error verifying access token:', error);
      throw new TokenException('Token verification failed', null);
    }
  }
  
  /**
   * Oznacza token jako użyty
   * @param {string} tokenId ID tokenu
   * @param {string} ipAddress Adres IP
   * @param {string} userAgent User agent
   * @returns {Promise<void>}
   */
  async markTokenAsUsed(tokenId, ipAddress, userAgent) {
    try {
      const { error } = await supabaseAdmin
        .from('access_tokens')
        .update({
          used: true,
          used_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent
        })
        .eq('id', tokenId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking token as used:', error);
      throw new ApplicationException('Failed to mark token as used', 'TOKEN_ERROR');
    }
  }
  
  /**
   * Hashuje token
   * @private
   * @param {string} tokenValue Wartość tokenu
   * @returns {string} Hash tokenu
   */
  hashToken(tokenValue) {
    return crypto
      .createHash('sha256')
      .update(tokenValue + this.tokenSalt)
      .digest('hex');
  }
  
  /**
   * Pobiera wszystkie tokeny dla zakupu
   * @param {string} purchaseId ID zakupu
   * @returns {Promise<Array>} Lista tokenów
   */
  async getTokensForPurchase(purchaseId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('access_tokens')
        .select('*')
        .eq('purchase_record_id', purchaseId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(token => ({
        id: token.id,
        purchaseId: token.purchase_record_id,
        expiresAt: token.expires_at,
        used: token.used,
        usedAt: token.used_at,
        ipAddress: token.ip_address,
        userAgent: token.user_agent,
        createdAt: token.created_at
      }));
    } catch (error) {
      console.error('Error getting tokens for purchase:', error);
      throw new ApplicationException('Failed to get tokens for purchase', 'TOKEN_ERROR');
    }
  }
  
  /**
   * Unieważnia wszystkie tokeny dla zakupu
   * @param {string} purchaseId ID zakupu
   * @returns {Promise<boolean>} Czy operacja się powiodła
   */
  async invalidateTokensForPurchase(purchaseId) {
    try {
      const { error } = await supabaseAdmin
        .from('access_tokens')
        .update({
          used: true,
          used_at: new Date().toISOString(),
          invalidated: true
        })
        .eq('purchase_record_id', purchaseId)
        .eq('used', false);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error invalidating tokens:', error);
      throw new ApplicationException('Failed to invalidate tokens', 'TOKEN_ERROR');
    }
  }
  
  /**
   * Generuje token resetowania hasła dla użytkownika (metoda pomocnicza)
   * @param {string} userId ID użytkownika
   * @param {number} expiryMinutes Czas ważności w minutach
   * @returns {Promise<Object>} Dane tokenu
   */
  async generatePasswordResetToken(userId, expiryMinutes = 60) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // Ustaw czas wygaśnięcia
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
      
      // Wygeneruj token
      const tokenValue = crypto.randomBytes(this.options.tokenLength).toString('hex');
      const tokenHash = this.hashToken(tokenValue);
      
      // Unieważnij stare tokeny resetowania hasła
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('user_id', userId)
        .eq('used', false);
      
      // Zapisz nowy token
      const tokenId = Id.create().toString();
      const tokenData = {
        id: tokenId,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert([tokenData]);
      
      if (error) throw error;
      
      // Zwróć dane tokenu
      return {
        token: tokenValue,
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      console.error('Error generating password reset token:', error);
      throw new ApplicationException('Failed to generate password reset token', 'TOKEN_ERROR');
    }
  }
}

export default TokenServiceAdapter;