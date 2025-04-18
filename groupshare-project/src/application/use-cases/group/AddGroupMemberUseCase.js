// /src/application/use-cases/group/AddGroupMemberUseCase.js
import IUseCase from '../../interfaces/IUseCase';
import AddGroupMemberValidator from '../../validators/group/AddGroupMemberValidator';
import GroupMemberMapper from '../../mappers/GroupMemberMapper';
import { Id } from '../../../domain/shared/value-objects/Id';
import { UnauthorizedException, NotFoundException, BusinessRuleViolationException } from '../../exceptions';

class AddGroupMemberUseCase extends IUseCase {
  constructor(
    groupRepository,
    userRepository,
    authorizationService,
    notificationService
  ) {
    super();
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.authorizationService = authorizationService;
    this.notificationService = notificationService;
    this.validator = new AddGroupMemberValidator();
    this.mapper = new GroupMemberMapper();
  }
  
  async execute(request) {
    // Validate the request
    this.validator.validate(request);
    
    // Check authorization
    const canManageMembers = await this.authorizationService.isGroupMember(
      request.currentUserId,
      request.groupId,
      ['admin', 'owner']
    );
    
    if (!canManageMembers) {
      throw new UnauthorizedException('You do not have permission to add members to this group');
    }
    
    // Get the group
    const group = await this.groupRepository.findById(request.groupId);
    if (!group) {
      throw new NotFoundException('Group not found', 'group');
    }
    
    // Get the user to add
    const userToAdd = await this.userRepository.findById(request.userIdToAdd);
    if (!userToAdd) {
      throw new NotFoundException('User to add not found', 'user');
    }
    
    // Check if user is already a member
    const existingMembership = await this.groupRepository.findMember(request.groupId, request.userIdToAdd);
    if (existingMembership && existingMembership.status.isActive()) {
      throw new BusinessRuleViolationException(
        'User is already a member of this group',
        'member_exists'
      );
    }
    
    // Create or update membership
    let member;
    if (existingMembership) {
      // Reactivate existing membership
      existingMembership.activate();
      await this.groupRepository.updateMember(existingMembership);
      member = existingMembership;
    } else {
      // Create new membership
      const memberId = Id.create();
      member = GroupMember.create(
        memberId,
        group.id,
        userToAdd.id,
        request.role || 'member',
        'active'
      );
      
      // Save member
      await this.groupRepository.addMember(member);
    }
    
    // Notify the added user
    await this.notificationService.notifyUserAddedToGroup(
      userToAdd.id,
      group.id,
      request.currentUserId
    );
    
    // Map to response DTO
    return this.mapper.toDto(member);
  }
}

export default AddGroupMemberUseCase;