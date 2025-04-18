// /src/application/use-cases/user/GetUserProfileUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { ResourceNotFoundException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class GetUserProfileRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.userId = null;
  }
}

// DTO Odpowiedzi
class GetUserProfileResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.id = null;
    this.displayName = null;
    this.email = null;
    this.profileType = null;
    this.verificationLevel = null;
    this.bio = null;
    this.avatarUrl = null;
    this.ratingAvg = 0;
    this.ratingCount = 0;
    this.createdAt = null;
  }
}

/**
 * Przypadek użycia pobierania profilu użytkownika
 */
class GetUserProfileUseCase extends BaseUseCase {
  constructor(userRepository) {
    super();
    this.userRepository = userRepository;
  }
  
  /**
   * Waliduje żądanie
   * @param {GetUserProfileRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {GetUserProfileRequestDTO} request Żądanie
   * @returns {Promise<GetUserProfileResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz użytkownika
    const user = await this.userRepository.findById(request.userId);
    
    if (!user) {
      throw new ResourceNotFoundException('User not found', 'user', request.userId);
    }
    
    // Przygotuj odpowiedź
    const response = new GetUserProfileResponseDTO();
    response.id = user.id;
    response.displayName = user.displayName;
    response.email = user.email;
    response.profileType = user.profileType.toString();
    response.verificationLevel = user.verificationLevel.toString();
    response.bio = user.bio;
    response.avatarUrl = user.avatarUrl;
    response.ratingAvg = user.ratingAvg;
    response.ratingCount = user.ratingCount;
    response.createdAt = user.createdAt.toISOString();
    
    return response;
  }
}

module.exports = {
  GetUserProfileUseCase,
  GetUserProfileRequestDTO,
  GetUserProfileResponseDTO
};