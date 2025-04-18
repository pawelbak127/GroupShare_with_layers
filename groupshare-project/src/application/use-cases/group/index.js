// /src/application/use-cases/group/index.js

const { CreateGroupUseCase, CreateGroupRequestDTO, CreateGroupResponseDTO } = require('./CreateGroupUseCase');
const { JoinGroupUseCase, JoinGroupRequestDTO, JoinGroupResponseDTO } = require('./JoinGroupUseCase');
const { LeaveGroupUseCase, LeaveGroupRequestDTO, LeaveGroupResponseDTO } = require('./LeaveGroupUseCase');
const { UpdateGroupUseCase, UpdateGroupRequestDTO, UpdateGroupResponseDTO } = require('./UpdateGroupUseCase');
const { ListUserGroupsUseCase, ListUserGroupsRequestDTO, ListUserGroupsResponseDTO, GroupDTO } = require('./ListUserGroupsUseCase');

module.exports = {
  // Przypadki użycia
  CreateGroupUseCase,
  JoinGroupUseCase,
  LeaveGroupUseCase,
  UpdateGroupUseCase,
  ListUserGroupsUseCase,
  
  // DTO Żądań
  CreateGroupRequestDTO,
  JoinGroupRequestDTO,
  LeaveGroupRequestDTO,
  UpdateGroupRequestDTO,
  ListUserGroupsRequestDTO,
  
  // DTO Odpowiedzi
  CreateGroupResponseDTO,
  JoinGroupResponseDTO,
  LeaveGroupResponseDTO,
  UpdateGroupResponseDTO,
  ListUserGroupsResponseDTO,
  GroupDTO
};