// /src/application/use-cases/payment/ProcessPaymentUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { ResourceNotFoundException, BusinessRuleViolationException, PaymentException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class ProcessPaymentRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.purchaseId = null;
    this.paymentMethod = null;
    this.userId = null;
    this.ipAddress = null;
    this.userAgent = null;
  }
}

// DTO Odpowiedzi
class ProcessPaymentResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.transactionId = null;
    this.purchaseId = null;
    this.amount = null;
    this.currency = null;
    this.status = null;
    this.paymentUrl = null;
    this.accessUrl = null;
    this.accessToken = null;
  }
}

/**
 * Przypadek użycia przetwarzania płatności
 */
class ProcessPaymentUseCase extends BaseUseCase {
  constructor(
    purchaseRepository,
    transactionService,
    paymentGatewayService,
    tokenService
  ) {
    super();
    this.purchaseRepository = purchaseRepository;
    this.transactionService = transactionService;
    this.paymentGatewayService = paymentGatewayService;
    this.tokenService = tokenService;
  }
  
  /**
   * Waliduje żądanie
   * @param {ProcessPaymentRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.purchaseId) {
      errors.purchaseId = 'Purchase ID is required';
    }
    
    if (!request.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    } else {
      const allowedMethods = ['blik', 'card', 'transfer'];
      if (!allowedMethods.includes(request.paymentMethod)) {
        errors.paymentMethod = 'Payment method must be one of: blik, card, transfer';
      }
    }
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {ProcessPaymentRequestDTO} request Żądanie
   * @returns {Promise<ProcessPaymentResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz zakup
    const purchase = await this.purchaseRepository.findById(request.purchaseId);
    
    if (!purchase) {
      throw new ResourceNotFoundException('Purchase not found', 'purchase', request.purchaseId);
    }
    
    // Sprawdź czy zakup należy do użytkownika
    if (purchase.userId !== request.userId) {
      throw new BusinessRuleViolationException(
        'This purchase does not belong to the user',
        'purchase_owner_mismatch'
      );
    }
    
    // Sprawdź status zakupu
    if (!purchase.isPendingPayment()) {
      throw new BusinessRuleViolationException(
        'This purchase is not pending payment',
        'invalid_purchase_status'
      );
    }
    
    try {
      // Przetwórz transakcję
      const transactionResult = await this.transactionService.processPurchaseTransaction(
        request.userId,
        purchase.subscriptionId,
        request.paymentMethod
      );
      
      // Utwórz sesję płatności
      const paymentSession = await this.paymentGatewayService.createPaymentSession({
        transactionId: transactionResult.transactionId,
        amount: transactionResult.amount,
        currency: transactionResult.currency,
        paymentMethod: request.paymentMethod,
        description: `Zakup miejsca w subskrypcji`,
        metadata: {
          purchaseId: request.purchaseId,
          userId: request.userId,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent
        }
      });
      
      // Generuj token dostępu i URL
      let accessToken = null;
      let accessUrl = null;
      
      // Symuluj natychmiastowe zakończenie płatności dla celów demonstracyjnych
      if (process.env.NODE_ENV === 'development' || process.env.PAYMENT_SIMULATION === 'true') {
        // Oznacz zakup jako ukończony
        purchase.complete();
        await this.purchaseRepository.save(purchase);
        
        // Generuj token dostępu
        const tokenData = await this.tokenService.generateAccessToken(purchase.id);
        accessToken = tokenData.token;
        accessUrl = `/access/${purchase.id}?token=${accessToken}`;
      }
      
      // Przygotuj odpowiedź
      const response = new ProcessPaymentResponseDTO();
      response.transactionId = transactionResult.transactionId;
      response.purchaseId = request.purchaseId;
      response.amount = transactionResult.amount;
      response.currency = transactionResult.currency;
      response.status = transactionResult.status;
      response.paymentUrl = paymentSession.paymentUrl;
      response.accessUrl = accessUrl;
      response.accessToken = accessToken;
      
      return response;
    } catch (error) {
      throw new PaymentException(
        `Payment processing failed: ${error.message}`,
        null,
        { originalError: error.message }
      );
    }
  }
}

module.exports = {
  ProcessPaymentUseCase,
  ProcessPaymentRequestDTO,
  ProcessPaymentResponseDTO
};