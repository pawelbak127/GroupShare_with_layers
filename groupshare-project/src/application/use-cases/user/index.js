// /src/application/use-cases/user/index.js

const { RegisterUserUseCase, RegisterUserRequestDTO, RegisterUserResponseDTO } = require('./RegisterUserUseCase');
const { UpdateUserProfileUseCase, UpdateUserProfileRequestDTO, UpdateUserProfileResponseDTO } = require('./UpdateUserProfileUseCase');
const { GetUserProfileUseCase, GetUserProfileRequestDTO, GetUserProfileResponseDTO } = require('./GetUserProfileUseCase');

module.exports = {
  // Przypadki użycia
  RegisterUserUseCase,
  UpdateUserProfileUseCase,
  GetUserProfileUseCase,
  
  // DTO Żądań
  RegisterUserRequestDTO,
  UpdateUserProfileRequestDTO,
  GetUserProfileRequestDTO,
  
  // DTO Odpowiedzi
  RegisterUserResponseDTO,
  UpdateUserProfileResponseDTO,
  GetUserProfileResponseDTO
};