const crypto = require('crypto');
const { Id } = require('../../domain/shared/value-objects/Id');
const { TokenException } = require('../exceptions');

/**
 * Serwis zarządzający tokenami dostępu
 */
class TokenService {
  constructor(accessTokenRepository) {
    this.accessTokenRepository = accessTokenRepository;
    this.tokenSalt = process.env.TOKEN_SALT || 'default-salt';
  }

  /**
   * Generuje nowy token dostępu
   * @param {string} purchaseId ID zakupu
   * @param {number} expiryMinutes Czas ważności w minutach
   * @returns {Promise<Object>} Dane tokenu
   */
  async generateAccessToken(purchaseId, expiryMinutes = 30) {
    // Wygeneruj token
    const tokenValue = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(tokenValue);
    
    // Ustal czas wygaśnięcia
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
    
    // Zapisz token w bazie danych
    const token = {
      id: Id.create().toString(),
      purchaseId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: new Date().toISOString()
    };
    
    await this.accessTokenRepository.save(token);
    
    // Zwróć dane tokenu
    return {
      token: tokenValue,
      expiresAt: expiresAt.toISOString()
    };
  }
  
  /**
   * Weryfikuje token dostępu
   * @param {string} purchaseId ID zakupu
   * @param {string} tokenValue Wartość tokenu
   * @returns {Promise<Object>} Zweryfikowany token
   * @throws {TokenException} W przypadku błędu
   */
  async verifyAccessToken(purchaseId, tokenValue) {
    // Oblicz hash tokenu
    const tokenHash = this.hashToken(tokenValue);
    
    // Znajdź token
    const token = await this.accessTokenRepository.findByPurchaseIdAndHash(purchaseId, tokenHash);
    
    if (!token) {
      throw new TokenException('Invalid token', null);
    }
    
    // Sprawdź czy token nie wygasł
    if (new Date(token.expiresAt) < new Date()) {
      throw new TokenException('Token expired', token.id);
    }
    
    // Sprawdź czy token nie został już użyty
    if (token.used) {
      throw new TokenException('Token already used', token.id);
    }
    
    return token;
  }
  
  /**
   * Oznacza token jako użyty
   * @param {string} tokenId ID tokenu
   * @param {string} ipAddress Adres IP
   * @param {string} userAgent User agent
   * @returns {Promise<void>}
   */
  async markTokenAsUsed(tokenId, ipAddress, userAgent) {
    await this.accessTokenRepository.markAsUsed(tokenId, ipAddress, userAgent);
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
}

module.exports = TokenService;