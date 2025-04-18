const BaseUseCase = require('../../BaseUseCase');
const { 
  ResourceNotFoundException, 
  BusinessRuleViolationException 
} = require('../../../exceptions');
const BaseDTO = require('../../../dtos/BaseDTO');

// DTO Żądania
class JoinGroupRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.userId = null;
    this.groupId = null;
    this.invitationCode = null;
  }
}

// DTO Odpowiedzi
class JoinGroupResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.groupId = null;
    this.groupName = null;
    this.role = null;
    this.status = null;
    this.joined = false;
    this.message = null;
  }
}

/**
 * Przypadek użycia dołączania do grupy
 */
class JoinGroupUseCase extends BaseUseCase {
  constructor(
    groupRepository,
    userRepository,
    groupInvitationRepository,
    notificationService
  ) {
    super();
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.groupInvitationRepository = groupInvitationRepository;
    this.notificationService = notificationService;
  }
  
  /**
   * Waliduje żądanie
   * @param {JoinGroupRequestDTO} request Żądanie
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
    
    // Kod zaproszenia może być opcjonalny w niektórych przypadkach
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {JoinGroupRequestDTO} request Żądanie
   * @returns {Promise<JoinGroupResponseDTO>} Odpowiedź
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
    
    // Sprawdź czy użytkownik nie jest już członkiem grupy
    const existingMembership = await this.groupRepository.findMembershipByUserAndGroup(
      request.userId,
      request.groupId
    );
    
    if (existingMembership) {
      if (existingMembership.isActive()) {
        throw new BusinessRuleViolationException(
          'User is already a member of this group',
          'already_member'
        );
      } else if (existingMembership.status.toString() === 'invited') {
        // Jeśli użytkownik został zaproszony, aktywuj członkostwo
        existingMembership.activate();
        await this.groupRepository.updateMembership(existingMembership);
        
        // Przygotuj odpowiedź
        const response = new JoinGroupResponseDTO();
        response.groupId = group.id;
        response.groupName = group.name;
        response.role = existingMembership.role.toString();
        response.status = 'active';
        response.joined = true;
        response.message = 'You have accepted the invitation to join this group';
        
        return response;
      }
    }
    
    // Sprawdź czy istnieje zaproszenie z kodem
    let invitation = null;
    
    if (request.invitationCode) {
      invitation = await this.groupInvitationRepository.findByCodeAndGroup(
        request.invitationCode,
        request.groupId
      );
      
      if (!invitation || invitation.isExpired()) {
        throw new BusinessRuleViolationException(
          'Invalid or expired invitation code',
          'invalid_invitation'
        );
      }
    } else {
      // Jeśli nie podano kodu, sprawdź czy grupa jest publiczna
      if (!group.isPublic()) {
        throw new BusinessRuleViolationException(
          'This group requires an invitation code to join',
          'invitation_required'
        );
      }
    }
    
    // Utwórz członkostwo
    const membership = GroupMember.create(
      Id.create(),
      request.groupId,
      request.userId,
      'member',
      'active'
    );
    
    // Zapisz członkostwo
    await this.groupRepository.saveMembership(membership);
    
    // Jeśli było zaproszenie, oznacz je jako wykorzystane
    if (invitation) {
      invitation.markAsUsed(request.userId);
      await this.groupInvitationRepository.save(invitation);
    }
    
    // Wyślij powiadomienie do właściciela grupy
    await this.notificationService.sendNotification(
      group.ownerId,
      'member_joined',
      'Nowy członek grupy',
      `${user.displayName} dołączył(a) do Twojej grupy "${group.name}"`,
      'group',
      group.id
    );
    
    // Przygotuj odpowiedź
    const response = new JoinGroupResponseDTO();
    response.groupId = group.id;
    response.groupName = group.name;
    response.role = membership.role.toString();
    response.status = membership.status.toString();
    response.joined = true;
    response.message = 'You have successfully joined the group';
    
    return response;
  }
}

module.exports = {
  JoinGroupUseCase,
  JoinGroupRequestDTO,
  JoinGroupResponseDTO
};