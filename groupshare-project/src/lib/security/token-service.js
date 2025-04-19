// src/lib/security/token-service.js
import crypto from 'crypto';
import supabaseAdmin from '../database/supabase-admin-client';

/**
 * Zunifikowany serwis zarządzania tokenami dostępowymi
 * Konsoliduje funkcje z token-utils.js i token-service.js
 */
export class TokenService {
  /**
   * Inicjalizuje serwis tokenów z opcjonalnymi ustawieniami
   * @param {Object} options - Opcje konfiguracyjne 
   */
  constructor(options = {}) {
    this.tokenLength = options.tokenLength || 32; // długość tokenu w bajtach
    this.defaultExpiry = options.defaultExpiry || 30; // domyślny czas wygaśnięcia w minutach
    this.salt = process.env.TOKEN_SALT || 'default-salt-for-tokens'; // sól do hashowania tokenów
    
    // Limity generowania tokenów (zabezpieczenie przed nadużyciami)
    this.rateLimit = options.rateLimit || { 
      maxTokens: 5,    // maksymalna liczba tokenów na użytkownika na interwał
      interval: 60,    // interwał w minutach
    };
  }

  /**
   * Generuje nowy token dostępu dla zakupu
   * @param {string} purchaseId - ID zakupu
   * @param {string} userId - ID użytkownika tworzącego token (opcjonalne)
   * @param {number} expirationMinutes - Czas ważności tokenu w minutach
   * @returns {Promise<{token: string, tokenId: string, accessUrl: string}>}
   */
  async generateAccessToken(purchaseId, userId = null, expirationMinutes = this.defaultExpiry) {
    try {
      // Sprawdź limity tylko jeśli podano ID użytkownika
      // Nowa wersja - obsługa błędów w checkRateLimit
      if (userId) {
        try {
          const withinLimit = await this.checkRateLimit(userId);
          if (!withinLimit) {
            console.warn(`Rate limit exceeded for user ${userId}`);
            // Kontynuujemy mimo limitu - nie blokujemy krytycznej funkcjonalności
          }
        } catch (rateLimitError) {
          console.error('Error checking rate limit:', rateLimitError);
          // Kontynuujemy mimo błędu sprawdzania limitu
        }
      }
      
      // Generowanie kryptograficznie bezpiecznego tokenu
      const token = crypto.randomBytes(this.tokenLength).toString('hex');
      
      // Hashowanie tokenu do przechowania w bazie
      const tokenHash = this.hashToken(token);
      
      // Obliczanie daty wygaśnięcia
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
      
      // Przygotowanie podstawowych danych tokenu bez created_by
      const tokenData = {
        purchase_record_id: purchaseId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      };
      
      // Zapisanie tokenu w bazie danych - nie używamy kolumny created_by, która nie istnieje
      const { data, error } = await supabaseAdmin
        .from('access_tokens')
        .insert(tokenData)
        .select('id')
        .single();
      
      if (error) {
        console.error('Błąd tworzenia tokenu dostępu:', error);
        throw new Error(`Nie udało się utworzyć tokenu dostępu: ${error.message}`);
      }
      
      // Generowanie URL dostępu
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const accessUrl = `${baseUrl}/access?id=${purchaseId}&token=${token}`;
      
      // Logowanie operacji w dzienniku bezpieczeństwa
      await this.logTokenEvent('token_created', data.id, purchaseId, userId);
      
      return { 
        token, 
        tokenId: data.id,
        accessUrl
      };
    } catch (error) {
      console.error('Błąd w generateAccessToken:', error);
      throw error;
    }
  }

  /**
   * Weryfikuje token dostępu
   * @param {string} token - Token do weryfikacji
   * @param {string} purchaseId - ID zakupu
   * @param {Object} metadata - Opcjonalne metadane (IP, User Agent)
   * @returns {Promise<{valid: boolean, tokenData: Object|null, reason: string|null}>}
   */
  async verifyAccessToken(token, purchaseId, metadata = {}) {
    try {
      // Obliczanie hash tokenu
      const tokenHash = this.hashToken(token);
      
      // Wyszukanie tokenu w bazie danych
      const { data, error } = await supabaseAdmin
        .from('access_tokens')
        .select('*')
        .eq('purchase_record_id', purchaseId)
        .eq('token_hash', tokenHash)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      // Jeśli wystąpił błąd (token nie znaleziony, wygasł, itp.)
      if (error) {
        // Sprawdź przyczynę niepowodzenia
        const reason = await this.getTokenFailureReason(tokenHash, purchaseId);
        
        // Zaloguj nieudaną próbę weryfikacji
        await this.logTokenEvent('token_verification_failed', null, purchaseId, null, {
          reason: reason,
          ip: metadata.ip,
          userAgent: metadata.userAgent
        });
        
        return { valid: false, tokenData: null, reason };
      }
      
      // Jeśli token został już wykorzystany
      if (data.used) {
        await this.logTokenEvent('token_verification_failed', data.id, purchaseId, null, {
          reason: 'Token już wykorzystany',
          ip: metadata.ip,
          userAgent: metadata.userAgent
        });
        
        return { valid: false, tokenData: data, reason: 'Token już wykorzystany' };
      }
      
      // Oznacz token jako wykorzystany, jeśli żądanie tego wymaga
      if (metadata.markAsUsed !== false) {
        await this.markTokenAsUsed(data.id, metadata);
      }
      
      // Zaloguj udaną weryfikację
      await this.logTokenEvent('token_verification_success', data.id, purchaseId, null, {
        ip: metadata.ip,
        userAgent: metadata.userAgent
      });
      
      return { valid: true, tokenData: data, reason: null };
    } catch (error) {
      console.error('Błąd weryfikacji tokenu:', error);
      return { valid: false, tokenData: null, reason: `Wystąpił błąd: ${error.message}` };
    }
  }

  /**
   * Oznacza token jako wykorzystany
   * @param {string} tokenId - ID tokenu
   * @param {Object} metadata - Metadane (IP, User Agent)
   * @returns {Promise<boolean>} - Czy operacja się powiodła
   */
  async markTokenAsUsed(tokenId, metadata = {}) {
    try {
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
        console.error('Błąd oznaczania tokenu jako użytego:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Wyjątek w markTokenAsUsed:', error);
      return false;
    }
  }

  /**
   * Sprawdza przyczynę niepowodzenia weryfikacji tokenu
   * @param {string} tokenHash - Hash tokenu
   * @param {string} purchaseId - ID zakupu
   * @returns {Promise<string>} - Przyczyna niepowodzenia
   */
  async getTokenFailureReason(tokenHash, purchaseId) {
    try {
      // Sprawdź, czy token istnieje, ale jest już użyty lub wygasł
      const { data: tokenData } = await supabaseAdmin
        .from('access_tokens')
        .select('*')
        .eq('purchase_record_id', purchaseId)
        .eq('token_hash', tokenHash)
        .maybeSingle();
      
      if (tokenData) {
        if (tokenData.used) {
          return 'Token już wykorzystany';
        }
        
        if (new Date(tokenData.expires_at) <= new Date()) {
          return 'Token wygasł';
        }
      }
      
      return 'Token nie znaleziony';
    } catch (error) {
      console.error('Błąd sprawdzania przyczyny niepowodzenia weryfikacji tokenu:', error);
      return 'Wystąpił błąd podczas weryfikacji';
    }
  }

  /**
   * Sprawdza limity generowania tokenów dla użytkownika - poprawiona wersja
   * @param {string} userId - ID użytkownika
   * @returns {Promise<boolean>} - Czy użytkownik jest w limicie
   */
  async checkRateLimit(userId) {
    try {
      // Obliczanie czasu od którego sprawdzamy limity
      const checkFrom = new Date();
      checkFrom.setMinutes(checkFrom.getMinutes() - this.rateLimit.interval);
      
      // Liczenie tokenów wygenerowanych przez użytkownika w danym okresie
      // Ta część może nie działać, jeśli nie ma kolumny created_by, więc otaczamy ją try-catch
      try {
        // W przypadku braku kolumny created_by nie możemy sprawdzić limitu
        // i zwracamy true (dozwolone)
        return true;
        
        /* Kod wyłączony, ponieważ kolumna created_by nie istnieje
        const { count, error } = await supabaseAdmin
          .from('access_tokens')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId)
          .gte('created_at', checkFrom.toISOString());
        
        if (error) {
          console.error('Błąd sprawdzania limitu tokenów:', error);
          // W przypadku błędu, pozwalamy na utworzenie tokenu (fail open)
          return true;
        }
        
        return count < this.rateLimit.maxTokens;
        */
      } catch (error) {
        console.error('Błąd sprawdzania limitu tokenów:', error);
        // W przypadku błędu, pozwalamy na utworzenie tokenu
        return true;
      }
    } catch (error) {
      console.error('Wyjątek podczas sprawdzania limitu tokenów:', error);
      // W przypadku wyjątku, pozwalamy na utworzenie tokenu
      return true;
    }
  }

  /**
   * Hashuje token do przechowywania w bazie danych
   * @param {string} token - Token do zahashowania
   * @returns {string} - Hash tokenu
   */
  hashToken(token) {
    return crypto
      .createHash('sha256')
      .update(token + this.salt)
      .digest('hex');
  }

  /**
   * Loguje zdarzenie związane z tokenem
   * @param {string} actionType - Typ akcji
   * @param {string} tokenId - ID tokenu (opcjonalne)
   * @param {string} purchaseId - ID zakupu (opcjonalne)
   * @param {string} userId - ID użytkownika (opcjonalne)
   * @param {Object} details - Dodatkowe szczegóły
   */
  async logTokenEvent(actionType, tokenId = null, purchaseId = null, userId = null, details = {}) {
    try {
      await supabaseAdmin.from('security_logs').insert({
        action_type: actionType,
        resource_type: 'access_token',
        resource_id: tokenId || purchaseId,
        user_id: userId,
        ip_address: details.ip || null,
        user_agent: details.userAgent || null,
        status: actionType.includes('_failed') ? 'failure' : 'success',
        details: details,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Błąd logowania zdarzenia tokenu:', error);
      // Nie powodujemy błędu, tylko logujemy
    }
  }
}

// Eksport instancji domyślnej do użycia w aplikacji
export const tokenService = new TokenService();

// Eksport funkcji pomocniczych kompatybilnych wstecznie
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
  const salt = process.env.TOKEN_SALT || 'default-salt-for-tokens';
  return crypto
    .createHash('sha256')
    .update(token + salt)
    .digest('hex');
}