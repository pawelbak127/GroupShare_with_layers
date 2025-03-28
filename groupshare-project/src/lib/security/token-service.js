import crypto from 'crypto';
import supabase from '../supabase-client';

/**
 * Serwis zarządzania tokenami jednorazowymi
 */
export class TokenService {
  // Generowanie jednorazowego tokenu dostępu
  async generateAccessToken(applicationId, expiresInMinutes = 30) {
    try {
      // Generowanie kryptograficznie bezpiecznego tokenu
      const token = crypto.randomBytes(32).toString('hex');
      
      // Haszowanie tokenu do przechowania w bazie
      const tokenHash = this.hashToken(token);
      
      // Obliczanie daty wygaśnięcia
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
      
      // Zapisanie hasha tokenu w bazie
      const { error } = await supabase
        .from('access_tokens')
        .insert({
          application_id: applicationId,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Zwrócenie oryginalnego tokenu (będzie dostępny tylko raz)
      return token;
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }
  
  // Weryfikacja tokenu
  async verifyToken(token, applicationId) {
    try {
      // Obliczenie hasha tokenu
      const tokenHash = this.hashToken(token);
      
      // Pobranie tokenu z bazy danych
      const { data, error } = await supabase
        .from('access_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .eq('application_id', applicationId)
        .single();
      
      if (error) return false;
      
      // Sprawdzenie czy token był już użyty
      if (data.used) return false;
      
      // Sprawdzenie czy token nie wygasł
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      if (now > expiresAt) return false;
      
      // Oznaczenie tokenu jako wykorzystanego
      const clientIP = this.getClientIp();
      const userAgent = this.getUserAgent();
      
      const { error: updateError } = await supabase
        .from('access_tokens')
        .update({
          used: true,
          used_at: now.toISOString(),
          ip_address: clientIP,
          user_agent: userAgent
        })
        .eq('token_hash', tokenHash);
      
      if (updateError) {
        console.error('Error marking token as used:', updateError);
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying access token:', error);
      return false;
    }
  }
  
  // Haszowanie tokenu
  hashToken(token) {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
  
  // Pomocnicze metody do pobrania informacji o kliencie
  getClientIp() {
    // W rzeczywistej implementacji pobrałoby IP z nagłówków żądania
    return '127.0.0.1';
  }
  
  getUserAgent() {
    // W rzeczywistej implementacji pobrałoby User Agent z nagłówków żądania
    return 'Test User Agent';
  }
}