import crypto from 'crypto';
import supabase from '../supabase-client';

/**
 * Serwis zarządzania tokenami jednorazowymi
 * z ulepszoną bezpiecznością i ochroną przed nadużyciami
 */
export class TokenService {
  constructor(options = {}) {
    this.tokenLength = options.tokenLength || 32; // długość tokenu w bajtach
    this.defaultExpiry = options.defaultExpiry || 30; // domyślny czas wygaśnięcia w minutach
    this.rateLimit = options.rateLimit || { 
      maxTokens: 5,    // maksymalna liczba tokenów na użytkownika na interwał
      interval: 60,    // interwał w minutach
    };
  }
  
  // Sprawdzenie limitów tokenów dla użytkownika
  async checkRateLimit(userId) {
    try {
      // Obliczanie czasu od którego sprawdzamy limity
      const checkFrom = new Date();
      checkFrom.setMinutes(checkFrom.getMinutes() - this.rateLimit.interval);
      
      // Liczenie tokenów wygenerowanych przez użytkownika w danym okresie
      const { count, error } = await supabase
        .from('access_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('created_at', checkFrom.toISOString());
      
      if (error) {
        console.error('Error checking token rate limit:', error);
        // W przypadku błędu, pozwalamy na utworzenie tokenu (fail open)
        return true;
      }
      
      return count < this.rateLimit.maxTokens;
    } catch (error) {
      console.error('Exception when checking token rate limit:', error);
      // W przypadku wyjątku, pozwalamy na utworzenie tokenu
      return true;
    }
  }

  // Generowanie jednorazowego tokenu dostępu z kontrolą limitów
  async generateAccessToken(applicationId, userId, expiresInMinutes = this.defaultExpiry) {
    try {
      // Sprawdzenie limitu tokenów
      const withinLimit = await this.checkRateLimit(userId);
      if (!withinLimit) {
        throw new Error('Token rate limit exceeded. Try again later.');
      }
      
      // Generowanie kryptograficznie bezpiecznego tokenu
      let token;
      try {
        // Używamy crypto.randomBytes do generowania losowych bajtów
        token = crypto.randomBytes(this.tokenLength).toString('hex');
        
        // Weryfikacja entropii tokenu
        if (!this.verifyTokenEntropy(token)) {
          throw new Error('Generated token has insufficient entropy');
        }
      } catch (cryptoError) {
        console.error('Error generating secure token:', cryptoError);
        throw new Error('Failed to generate secure token');
      }
      
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
          created_at: new Date().toISOString(),
          created_by: userId
        });
      
      if (error) throw error;
      
      // Zwrócenie oryginalnego tokenu (będzie dostępny tylko raz)
      return token;
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error(error.message || 'Failed to generate access token');
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
      
      // Dodanie wpisu audytowego
      this.logTokenUsage(data.id, clientIP, userAgent);
      
      return true;
    } catch (error) {
      console.error('Error verifying access token:', error);
      return false;
    }
  }
  
  // Sprawdzenie entropii tokenu (dodatkowa weryfikacja bezpieczeństwa)
  verifyTokenEntropy(token) {
    // Wymagamy przynajmniej 128 bitów entropii dla tokenów
    // token hex ma 2 znaki na bajt, więc minimalna długość to 32 znaki
    if (token.length < 32) return false;
    
    // Weryfikacja czy token zawiera różnorodne znaki
    const uniqueChars = new Set(token.split('')).size;
    // Oczekujemy przynajmniej 10 różnych znaków 
    return uniqueChars >= 10;
  }
  
  // Haszowanie tokenu
  hashToken(token) {
    return crypto
      .createHash('sha256')
      .update(token + (process.env.TOKEN_SALT || ''))
      .digest('hex');
  }
  
  // Logowanie użycia tokenu
  async logTokenUsage(tokenId, ipAddress, userAgent) {
    try {
      await supabase.from('security_logs').insert({
        action_type: 'token_usage',
        resource_type: 'access_token',
        resource_id: tokenId,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'success',
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging token usage:', error);
      // Nie powodujemy błędu, tylko logujemy
    }
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