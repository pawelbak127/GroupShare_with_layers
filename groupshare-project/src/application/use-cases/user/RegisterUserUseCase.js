// /src/application/use-cases/user/RegisterUserUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { ValidationException, BusinessRuleViolationException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');
const { Id } = require('../../../domain/shared/value-objects/Id');

// DTO Żądania
class RegisterUserRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.externalAuthId = null;
    this.displayName = null;
    this.email = null;
    this.profileType = 'both';
    this.avatarUrl = null;
  }
}

// DTO Odpowiedzi
class RegisterUserResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.id = null;
    this.externalAuthId = null;
    this.displayName = null;
    this.email = null;
    this.profileType = null;
    this.verificationLevel = null;
    this.createdAt = null;
  }
}

/**
 * Przypadek użycia rejestracji użytkownika
 */
class RegisterUserUseCase extends BaseUseCase {
  constructor(userRepository) {
    super();
    this.userRepository = userRepository;
  }
  
  /**
   * Waliduje żądanie
   * @param {RegisterUserRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.externalAuthId) {
      errors.externalAuthId = 'External authentication ID is required';
    }
    
    if (!request.displayName || request.displayName.length < 2) {
      errors.displayName = 'Display name must have at least 2 characters';
    }
    
    if (!request.email || !this.isValidEmail(request.email)) {
      errors.email = 'Valid email address is required';
    }
    
    if (request.profileType && !['buyer', 'seller', 'both'].includes(request.profileType)) {
      errors.profileType = 'Profile type must be one of: buyer, seller, both';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Sprawdza czy email jest poprawny
   * @private
   * @param {string} email Adres email
   * @returns {boolean} Czy email jest poprawny
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {RegisterUserRequestDTO} request Żądanie
   * @returns {Promise<RegisterUserResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Sprawdź czy użytkownik z takim externalAuthId już istnieje
    const existingUser = await this.userRepository.findByExternalAuthId(request.externalAuthId);
    
    if (existingUser) {
      throw new BusinessRuleViolationException(
        'User with this external authentication ID already exists',
        'user_already_exists'
      );
    }
    
    // Sprawdź czy użytkownik z takim adresem email już istnieje
    const existingEmail = await this.userRepository.findByEmail(request.email);
    
    if (existingEmail) {
      throw new BusinessRuleViolationException(
        'User with this email address already exists',
        'email_already_exists'
      );
    }
    
    // Utwórz użytkownika
    const user = User.create(
      Id.create(),
      request.externalAuthId,
      request.displayName,
      request.email,
      request.profileType || 'both'
    );
    
    // Ustaw awatar, jeśli podano
    if (request.avatarUrl) {
      user.updateProfile({ avatarUrl: request.avatarUrl });
    }
    
    // Zapisz użytkownika
    await this.userRepository.save(user);
    
    // Przygotuj odpowiedź
    const response = new RegisterUserResponseDTO();
    response.id = user.id;
    response.externalAuthId = user.externalAuthId;
    response.displayName = user.displayName;
    response.email = user.email;
    response.profileType = user.profileType.toString();
    response.verificationLevel = user.verificationLevel.toString();
    response.createdAt = user.createdAt.toISOString();
    
    return response;
  }
}

module.exports = {
  RegisterUserUseCase,
  RegisterUserRequestDTO,
  RegisterUserResponseDTO
};