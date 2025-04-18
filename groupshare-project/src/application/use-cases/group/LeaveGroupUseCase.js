// /src/application/use-cases/group/LeaveGroupUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { ResourceNotFoundException, BusinessRuleViolationException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class LeaveGroupRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.userId = null;
    this.groupId = null;
  }
}

// DTO Odpowiedzi
class LeaveGroupResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.success = false;
    this.message = null;
    this.groupId = null;
    this.groupName = null;
  }
}

/**
 * Przypadek użycia opuszczania grupy
 */
class LeaveGroupUseCase extends BaseUseCase {
  constructor(
    groupRepository,
    userRepository,
    notificationService
  ) {
    super();
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
  }
  
  /**
   * Waliduje żądanie
   * @param {LeaveGroupRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    if (!request.groupId) {
      errors.groupId = 'Group ID is required';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {LeaveGroupRequestDTO} request Żądanie
   * @returns {Promise<LeaveGroupResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz grupę i użytkownika
    const group = await this.groupRepository.findById(request.groupId);
    const user = await this.userRepository.findById(request.userId);
    
    if (!group) {
      throw new ResourceNotFoundException('Group not found', 'group', request.groupId);
    }
    
    if (!user) {
      throw new ResourceNotFoundException('User not found', 'user', request.userId);
    }
    
    // Sprawdź czy użytkownik nie jest właścicielem
    if (group.ownerId === request.userId) {
      throw new BusinessRuleViolationException(
        'Group owner cannot leave the group',
        'owner_leave_attempt'
      );
    }
    
    // Sprawdź czy użytkownik jest członkiem grupy
    const membership = await this.groupRepository.findMembershipByUserAndGroup(
      request.userId,
      request.groupId
    );
    
    if (!membership || !membership.isActive()) {
      throw new BusinessRuleViolationException(
        'You are not a member of this group',
        'not_a_member'
      );
    }
    
    // Usuń członkostwo
    await this.groupRepository.removeMembership(membership.id);
    
    // Wyślij powiadomienie do właściciela grupy
    await this.notificationService.sendNotification(
      group.ownerId,
      'member_left',
      'Członek opuścił grupę',
      `${user.displayName} opuścił(a) Twoją grupę "${group.name}"`,
      'group',
      group.id
    );
    
    // Przygotuj odpowiedź
    const response = new LeaveGroupResponseDTO();
    response.success = true;
    response.message = `You have successfully left the group "${group.name}"`;
    response.groupId = group.id;
    response.groupName = group.name;
    
    return response;
  }
}

module.exports = {
  LeaveGroupUseCase,
  LeaveGroupRequestDTO,
  LeaveGroupResponseDTO
};