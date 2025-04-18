const BaseUseCase = require('../../BaseUseCase');
const { ResourceNotFoundException, ValidationException } = require('../../../exceptions');
const BaseDTO = require('../../../dtos/BaseDTO');

// DTO Żądania
class UpdateUserProfileRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.userId = null;
    this.displayName = null;
    this.bio = null;
    this.avatarUrl = null;
    this.profileType = null;
  }
}

// DTO Odpowiedzi
class UpdateUserProfileResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.id = null;
    this.displayName = null;
    this.email = null;
    this.bio = null;
    this.avatarUrl = null;
    this.profileType = null;
    this.verificationLevel = null;
    this.ratingAvg = null;
    this.ratingCount = null;
    this.updatedAt = null;
  }
}

/**
 * Przypadek użycia aktualizacji profilu użytkownika
 */
class UpdateUserProfileUseCase extends BaseUseCase {
  constructor(userRepository) {
    super();
    this.userRepository = userRepository;
  }
  
  /**
   * Waliduje żądanie
   * @param {UpdateUserProfileRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    // Sprawdź tylko te pola, które są przekazywane
    if (request.displayName !== undefined && request.displayName !== null) {
      if (request.displayName.trim().length < 2) {
        errors.displayName = 'Display name must have at least 2 characters';
      }
    }
    
    if (request.profileType !== undefined && request.profileType !== null) {
      const allowedTypes = ['buyer', 'seller', 'both'];
      if (!allowedTypes.includes(request.profileType)) {
        errors.profileType = 'Profile type must be one of: buyer, seller, both';
      }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {UpdateUserProfileRequestDTO} request Żądanie
   * @returns {Promise<UpdateUserProfileResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz użytkownika
    const user = await this.userRepository.findById(request.userId);
    
    if (!user) {
      throw new ResourceNotFoundException('User not found', 'user', request.userId);
    }
    
    // Przygotuj dane do aktualizacji
    const changes = {};
    
    if (request.displayName !== undefined && request.displayName !== null) {
      changes.displayName = request.displayName.trim();
    }
    
    if (request.bio !== undefined) {
      changes.bio = request.bio;
    }
    
    if (request.avatarUrl !== undefined) {
      changes.avatarUrl = request.avatarUrl;
    }
    
    if (request.profileType !== undefined && request.profileType !== null) {
      changes.profileType = request.profileType;
    }
    
    // Jeśli nie ma żadnych zmian, zwróć aktualny profil
    if (Object.keys(changes).length === 0) {
      const response = new UpdateUserProfileResponseDTO();
      response.id = user.id;
      response.displayName = user.displayName;
      response.email = user.email;
      response.bio = user.bio;
      response.avatarUrl = user.avatarUrl;
      response.profileType = user.profileType.toString();
      response.verificationLevel = user.verificationLevel.toString();
      response.ratingAvg = user.ratingAvg;
      response.ratingCount = user.ratingCount;
      response.updatedAt = user.updatedAt.toISOString();
      
      return response;
    }
    
    // Zaktualizuj profil
    user.updateProfile(changes);
    await this.userRepository.save(user);
    
    // Przygotuj odpowiedź
    const response = new UpdateUserProfileResponseDTO();
    response.id = user.id;
    response.displayName = user.displayName;
    response.email = user.email;
    response.bio = user.bio;
    response.avatarUrl = user.avatarUrl;
    response.profileType = user.profileType.toString();
    response.verificationLevel = user.verificationLevel.toString();
    response.ratingAvg = user.ratingAvg;
    response.ratingCount = user.ratingCount;
    response.updatedAt = user.updatedAt.toISOString();
    
    return response;
  }
}

module.exports = {
  UpdateUserProfileUseCase,
  UpdateUserProfileRequestDTO,
  UpdateUserProfileResponseDTO
};