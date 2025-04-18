// /src/application/use-cases/access/index.js

const { ProvideAccessInstructionsUseCase, ProvideAccessInstructionsRequestDTO, ProvideAccessInstructionsResponseDTO } = require('./ProvideAccessInstructionsUseCase');
const { ValidateAccessTokenUseCase, ValidateAccessTokenRequestDTO, ValidateAccessTokenResponseDTO } = require('./ValidateAccessTokenUseCase');
const { ConfirmAccessUseCase, ConfirmAccessRequestDTO, ConfirmAccessResponseDTO } = require('./ConfirmAccessUseCase');
const { ReportAccessProblemUseCase, ReportAccessProblemRequestDTO, ReportAccessProblemResponseDTO } = require('./ReportAccessProblemUseCase');

module.exports = {
  // Przypadki użycia
  ProvideAccessInstructionsUseCase,
  ValidateAccessTokenUseCase,
  ConfirmAccessUseCase,
  ReportAccessProblemUseCase,
  
  // DTO Żądań
  ProvideAccessInstructionsRequestDTO,
  ValidateAccessTokenRequestDTO,
  ConfirmAccessRequestDTO,
  ReportAccessProblemRequestDTO,
  
  // DTO Odpowiedzi
  ProvideAccessInstructionsResponseDTO,
  ValidateAccessTokenResponseDTO,
  ConfirmAccessResponseDTO,
  ReportAccessProblemResponseDTO
};