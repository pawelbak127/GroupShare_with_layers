// /src/application/use-cases/payment/index.js

const { ProcessPaymentUseCase, ProcessPaymentRequestDTO, ProcessPaymentResponseDTO } = require('./ProcessPaymentUseCase');
const { RefundPaymentUseCase, RefundPaymentRequestDTO, RefundPaymentResponseDTO } = require('./RefundPaymentUseCase');

module.exports = {
  // Przypadki użycia
  ProcessPaymentUseCase,
  RefundPaymentUseCase,
  
  // DTO Żądań
  ProcessPaymentRequestDTO,
  RefundPaymentRequestDTO,
  
  // DTO Odpowiedzi
  ProcessPaymentResponseDTO,
  RefundPaymentResponseDTO
};