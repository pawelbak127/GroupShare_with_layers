// /src/application/use-cases/group/UpdateGroupUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { AuthorizationException, ResourceNotFoundException, ValidationException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class UpdateGroupRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.groupId = null;
    this.name = null;
    this.description = null;
    this.userId = null; // ID użytkownika wykonującego akcję
  }
}

// DTO Odpowiedzi
class UpdateGroupResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.id = null;
    this.name = null;
    this.description = null;
    this.ownerId = null;
    this.role = null;
    this.isOwner = false;
    this.updatedAt = null;
  }
}

/**
 * Przypadek użycia aktualizacji grupy
 */
class UpdateGroupUseCase extends BaseUseCase {
  constructor(
    groupRepository,
    authorizationService
  ) {
    super();
    this.groupRepository = groupRepository;
    this.authorizationService = authorizationService;
  }
  
  /**
   * Waliduje żądanie
   * @param {UpdateGroupRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.groupId) {
      errors.groupId = 'Group ID is required';
    }
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    // Walidacja tylko przekazanych pól
    if (request.name !== undefined && request.name !== null && request.name.trim().length < 3) {
      errors.name = 'Group name must be at least 3 characters long';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Sprawdza uprawnienia
   * @param {UpdateGroupRequestDTO} request Żądanie
   * @throws {AuthorizationException} Gdy brak uprawnień
   */
  async authorize(request) {
    const hasPermission = await this.authorizationService.hasGroupPermission(
      request.userId,
      request.groupId,
      'admin'
    );
    
    if (!hasPermission) {
      throw new AuthorizationException(
        'You do not have permission to update this group',
        'group_admin'
      );
    }
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {UpdateGroupRequestDTO} request Żądanie
   * @returns {Promise<UpdateGroupResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz grupę
    const group = await this.groupRepository.findById(request.groupId);
    
    if (!group) {
      throw new ResourceNotFoundException('Group not found', 'group', request.groupId);
    }
    
    // Przygotuj dane do aktualizacji
    const updates = {};
    
    if (request.name !== undefined && request.name !== null) {
      updates.name = request.name.trim();
    }
    
    if (request.description !== undefined) {
      updates.description = request.description?.trim() || null;
    }
    
    // Aktualizuj grupę
    group.update(updates);
    await this.groupRepository.save(group);
    
    // Sprawdź rolę użytkownika
    const isOwner = group.ownerId === request.userId;
    const role = isOwner ? 'owner' : 'admin';
    
    // Przygotuj odpowiedź
    const response = new UpdateGroupResponseDTO();
    response.id = group.id;
    response.name = group.name;
    response.description = group.description;
    response.ownerId = group.ownerId;
    response.role = role;
    response.isOwner = isOwner;
    response.updatedAt = group.updatedAt.toISOString();
    
    return response;
  }
}

module.exports = {
  UpdateGroupUseCase,
  UpdateGroupRequestDTO,
  UpdateGroupResponseDTO
};