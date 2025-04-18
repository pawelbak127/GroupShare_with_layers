// /src/application/use-cases/payment/RefundPaymentUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { ResourceNotFoundException, BusinessRuleViolationException, PaymentException, AuthorizationException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class RefundPaymentRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.transactionId = null;
    this.userId = null; // ID użytkownika wykonującego akcję
    this.reason = null;
  }
}

// DTO Odpowiedzi
class RefundPaymentResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.transactionId = null;
    this.purchaseId = null;
    this.refundId = null;
    this.amount = null;
    this.currency = null;
    this.status = null;
    this.message = null;
  }
}

/**
 * Przypadek użycia zwrotu płatności
 */
class RefundPaymentUseCase extends BaseUseCase {
  constructor(
    transactionRepository,
    purchaseRepository,
    authorizationService,
    paymentGatewayService,
    notificationService
  ) {
    super();
    this.transactionRepository = transactionRepository;
    this.purchaseRepository = purchaseRepository;
    this.authorizationService = authorizationService;
    this.paymentGatewayService = paymentGatewayService;
    this.notificationService = notificationService;
  }
  
  /**
   * Waliduje żądanie
   * @param {RefundPaymentRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.transactionId) {
      errors.transactionId = 'Transaction ID is required';
    }
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    // Powód jest opcjonalny, ale jeśli jest podany, to musi mieć odpowiednią długość
    if (request.reason !== undefined && request.reason !== null && request.reason.trim().length < 5) {
      errors.reason = 'Reason must be at least 5 characters long';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Sprawdza uprawnienia
   * @param {RefundPaymentRequestDTO} request Żądanie
   * @throws {AuthorizationException} Gdy brak uprawnień
   */
  async authorize(request) {
    // Pobierz transakcję
    const transaction = await this.transactionRepository.findById(request.transactionId);
    
    if (!transaction) {
      throw new ResourceNotFoundException('Transaction not found', 'transaction', request.transactionId);
    }
    
    // Sprawdź czy użytkownik jest sprzedającym
    if (transaction.sellerId !== request.userId) {
      // Sprawdź czy jest adminem subskrypcji
      const hasPermission = await this.authorizationService.hasSubscriptionPermission(
        request.userId,
        transaction.subscriptionId,
        'admin'
      );
      
      if (!hasPermission) {
        throw new AuthorizationException(
          'You do not have permission to refund this transaction',
          'refund_permission'
        );
      }
    }
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {RefundPaymentRequestDTO} request Żądanie
   * @returns {Promise<RefundPaymentResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz transakcję
    const transaction = await this.transactionRepository.findById(request.transactionId);
    
    // Sprawdź status transakcji
    if (!transaction.status.isCompleted()) {
      throw new BusinessRuleViolationException(
        'Only completed transactions can be refunded',
        'invalid_transaction_status'
      );
    }
    
    if (transaction.status.isRefunded()) {
      throw new BusinessRuleViolationException(
        'This transaction has already been refunded',
        'already_refunded'
      );
    }
    
    // Pobierz zakup
    const purchase = await this.purchaseRepository.findById(transaction.purchaseId);
    
    if (!purchase) {
      throw new ResourceNotFoundException('Purchase not found', 'purchase', transaction.purchaseId);
    }
    
    try {
      // Wykonaj zwrot
      const refundResult = await this.paymentGatewayService.refundPayment({
        transactionId: transaction.id,
        paymentId: transaction.paymentId,
        amount: transaction.amount.amount,
        currency: transaction.amount.currency,
        reason: request.reason || 'Refund requested by seller'
      });
      
      // Zaktualizuj status transakcji
      transaction.refund();
      await this.transactionRepository.save(transaction);
      
      // Zaktualizuj status zakupu
      purchase.markAsProblem();
      await this.purchaseRepository.save(purchase);
      
      // Wyślij powiadomienia
      await this.notificationService.sendNotification(
        purchase.userId,
        'payment_refunded',
        'Zwrot płatności',
        `Otrzymałeś zwrot płatności za subskrypcję. Powód: ${request.reason || 'Nie podano powodu'}`,
        'purchase',
        purchase.id
      );
      
      // Przygotuj odpowiedź
      const response = new RefundPaymentResponseDTO();
      response.transactionId = transaction.id;
      response.purchaseId = purchase.id;
      response.refundId = refundResult.refundId;
      response.amount = transaction.amount.amount;
      response.currency = transaction.amount.currency;
      response.status = 'refunded';
      response.message = 'Refund processed successfully';
      
      return response;
    } catch (error) {
      throw new PaymentException(
        `Refund processing failed: ${error.message}`,
        transaction.id,
        { originalError: error.message }
      );
    }
  }
}

module.exports = {
  RefundPaymentUseCase,
  RefundPaymentRequestDTO,
  RefundPaymentResponseDTO
};