// /src/application/use-cases/group/CreateGroupUseCase.js
import IUseCase from '../../interfaces/IUseCase';
import CreateGroupValidator from '../../validators/group/CreateGroupValidator';
import GroupMapper from '../../mappers/GroupMapper';
import { Id } from '../../../domain/shared/value-objects/Id';
import { UnauthorizedException } from '../../exceptions';

class CreateGroupUseCase extends IUseCase {
  constructor(
    groupRepository,
    userRepository
  ) {
    super();
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.validator = new CreateGroupValidator();
    this.mapper = new GroupMapper();
  }
  
  async execute(request) {
    // Validate the request
    this.validator.validate(request);
    
    // Get the user
    const user = await this.userRepository.findByExternalAuthId(request.externalAuthId);
    if (!user) {
      throw new UnauthorizedException('User not found or not authorized');
    }
    
    // Create group
    const groupId = Id.create();
    const group = Group.create(
      groupId,
      request.name,
      user.id,
      request.description
    );
    
    // Save group
    await this.groupRepository.save(group);
    
    // Create membership for owner
    const memberId = Id.create();
    const member = GroupMember.create(
      memberId,
      group.id,
      user.id,
      'admin',
      'active'
    );
    
    // Save member
    await this.groupRepository.addMember(member);
    
    // Map to response DTO
    return this.mapper.toDto(group);
  }
}

export default CreateGroupUseCase;