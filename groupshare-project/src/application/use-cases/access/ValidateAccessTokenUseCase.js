// /src/application/use-cases/access/ValidateAccessTokenUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { TokenException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class ValidateAccessTokenRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.purchaseId = null;
    this.token = null;
    this.ipAddress = null;
    this.userAgent = null;
  }
}

// DTO Odpowiedzi
class ValidateAccessTokenResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.tokenId = null;
    this.purchaseId = null;
    this.valid = false;
    this.expiresAt = null;
    this.message = null;
  }
}

/**
 * Przypadek użycia walidacji tokenu dostępu
 */
class ValidateAccessTokenUseCase extends BaseUseCase {
  constructor(tokenService) {
    super();
    this.tokenService = tokenService;
  }
  
  /**
   * Waliduje żądanie
   * @param {ValidateAccessTokenRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.purchaseId) {
      errors.purchaseId = 'Purchase ID is required';
    }
    
    if (!request.token) {
      errors.token = 'Token is required';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {ValidateAccessTokenRequestDTO} request Żądanie
   * @returns {Promise<ValidateAccessTokenResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    try {
      // Weryfikuj token
      const tokenData = await this.tokenService.verifyAccessToken(
        request.purchaseId,
        request.token
      );
      
      // Przygotuj odpowiedź
      const response = new ValidateAccessTokenResponseDTO();
      response.tokenId = tokenData.id;
      response.purchaseId = request.purchaseId;
      response.valid = true;
      response.expiresAt = tokenData.expiresAt;
      response.message = 'Token is valid';
      
      return response;
    } catch (error) {
      // W przypadku błędu walidacji, nie rzucaj wyjątku, tylko zwróć odpowiedź z informacją o błędzie
      const response = new ValidateAccessTokenResponseDTO();
      response.purchaseId = request.purchaseId;
      response.valid = false;
      response.message = error instanceof TokenException ? error.message : 'Token validation failed';
      
      return response;
    }
  }
}

module.exports = {
  ValidateAccessTokenUseCase,
  ValidateAccessTokenRequestDTO,
  ValidateAccessTokenResponseDTO
};