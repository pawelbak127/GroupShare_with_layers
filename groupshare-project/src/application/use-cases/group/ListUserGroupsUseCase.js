// /src/application/use-cases/group/ListUserGroupsUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { ResourceNotFoundException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class ListUserGroupsRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.userId = null;
    this.role = null; // opcjonalnie filtruj po roli (owner, admin, member)
  }
}

// DTO Grupy
class GroupDTO extends BaseDTO {
  constructor() {
    super();
    this.id = null;
    this.name = null;
    this.description = null;
    this.ownerId = null;
    this.ownerName = null;
    this.role = null;
    this.isOwner = false;
    this.memberCount = 0;
    this.subscriptionCount = 0;
    this.createdAt = null;
  }
}

// DTO Odpowiedzi
class ListUserGroupsResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.groups = [];
    this.ownedGroups = 0;
    this.memberGroups = 0;
    this.totalGroups = 0;
  }
}

/**
 * Przypadek użycia pobierania grup użytkownika
 */
class ListUserGroupsUseCase extends BaseUseCase {
  constructor(
    groupRepository,
    userRepository
  ) {
    super();
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
  }
  
  /**
   * Waliduje żądanie
   * @param {ListUserGroupsRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    if (request.role !== undefined && request.role !== null) {
      const allowedRoles = ['owner', 'admin', 'member'];
      if (!allowedRoles.includes(request.role)) {
        errors.role = 'Role must be one of: owner, admin, member';
      }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {ListUserGroupsRequestDTO} request Żądanie
   * @returns {Promise<ListUserGroupsResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Sprawdź czy użytkownik istnieje
    const user = await this.userRepository.findById(request.userId);
    
    if (!user) {
      throw new ResourceNotFoundException('User not found', 'user', request.userId);
    }
    
    // Pobierz grupy użytkownika
    let ownedGroups = [];
    let memberGroups = [];
    
    // Jeśli rola nie jest określona lub 'owner', pobierz grupy, których użytkownik jest właścicielem
    if (!request.role || request.role === 'owner') {
      ownedGroups = await this.groupRepository.findByOwnerId(request.userId);
    }
    
    // Jeśli rola nie jest określona lub 'member' lub 'admin', pobierz grupy, do których użytkownik należy
    if (!request.role || request.role === 'member' || request.role === 'admin') {
      memberGroups = await this.groupRepository.findByMemberId(request.userId);
      
      // Jeśli rola to 'admin', filtruj tylko grupy, w których użytkownik jest adminem
      if (request.role === 'admin') {
        memberGroups = memberGroups.filter(membership => 
          membership.role.toString() === 'admin'
        );
      }
    }
    
    // Utwórz DTO dla grup
    const groupDTOs = [];
    
    // Dodaj grupy, których użytkownik jest właścicielem
    for (const group of ownedGroups) {
      const members = await this.groupRepository.countMembers(group.id);
      const subscriptions = await this.groupRepository.countSubscriptions(group.id);
      
      const dto = new GroupDTO();
      dto.id = group.id;
      dto.name = group.name;
      dto.description = group.description;
      dto.ownerId = group.ownerId;
      dto.ownerName = user.displayName; // Właściciel to użytkownik
      dto.role = 'owner';
      dto.isOwner = true;
      dto.memberCount = members;
      dto.subscriptionCount = subscriptions;
      dto.createdAt = group.createdAt.toISOString();
      
      groupDTOs.push(dto);
    }
    
    // Dodaj grupy, do których użytkownik należy
    for (const membership of memberGroups) {
      // Pobierz grupę
      const group = await this.groupRepository.findById(membership.groupId);
      
      // Pomiń grupy, których użytkownik jest właścicielem (już je dodaliśmy)
      if (group.ownerId === request.userId) {
        continue;
      }
      
      // Pobierz dane właściciela
      const owner = await this.userRepository.findById(group.ownerId);
      
      const members = await this.groupRepository.countMembers(group.id);
      const subscriptions = await this.groupRepository.countSubscriptions(group.id);
      
      const dto = new GroupDTO();
      dto.id = group.id;
      dto.name = group.name;
      dto.description = group.description;
      dto.ownerId = group.ownerId;
      dto.ownerName = owner ? owner.displayName : 'Unknown';
      dto.role = membership.role.toString();
      dto.isOwner = false;
      dto.memberCount = members;
      dto.subscriptionCount = subscriptions;
      dto.createdAt = group.createdAt.toISOString();
      
      groupDTOs.push(dto);
    }
    
    // Przygotuj odpowiedź
    const response = new ListUserGroupsResponseDTO();
    response.groups = groupDTOs;
    response.ownedGroups = ownedGroups.length;
    response.memberGroups = memberGroups.length - ownedGroups.length; // Odejmujemy grupy, które są liczone podwójnie
    response.totalGroups = groupDTOs.length;
    
    return response;
  }
}

module.exports = {
  ListUserGroupsUseCase,
  ListUserGroupsRequestDTO,
  ListUserGroupsResponseDTO,
  GroupDTO
};