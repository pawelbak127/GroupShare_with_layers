const BaseUseCase = require('../../BaseUseCase');
const { 
  BusinessRuleViolationException, 
  ResourceNotFoundException 
} = require('../../../exceptions');
const BaseDTO = require('../../../dtos/BaseDTO');

// DTO Żądania
class PurchaseSubscriptionSlotRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.userId = null;
    this.subscriptionId = null;
    this.paymentMethod = null;
  }
}

// DTO Odpowiedzi
class PurchaseSubscriptionSlotResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.purchaseId = null;
    this.transactionId = null;
    this.amount = null;
    this.currency = null;
    this.status = null;
    this.paymentUrl = null;
  }
}

/**
 * Przypadek użycia zakupu miejsca w subskrypcji
 */
class PurchaseSubscriptionSlotUseCase extends BaseUseCase {
  constructor(
    subscriptionRepository,
    purchaseRepository,
    transactionService,
    paymentGatewayService
  ) {
    super();
    this.subscriptionRepository = subscriptionRepository;
    this.purchaseRepository = purchaseRepository;
    this.transactionService = transactionService;
    this.paymentGatewayService = paymentGatewayService;
  }
  
  /**
   * Waliduje żądanie
   * @param {PurchaseSubscriptionSlotRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    if (!request.subscriptionId) {
      errors.subscriptionId = 'Subscription ID is required';
    }
    
    if (!request.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {PurchaseSubscriptionSlotRequestDTO} request Żądanie
   * @returns {Promise<PurchaseSubscriptionSlotResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz subskrypcję
    const subscription = await this.subscriptionRepository.findById(request.subscriptionId);
    
    if (!subscription) {
      throw new ResourceNotFoundException('Subscription not found', 'subscription', request.subscriptionId);
    }
    
    // Sprawdź czy subskrypcja jest dostępna
    if (!subscription.isPurchasable()) {
      throw new BusinessRuleViolationException(
        'Subscription is not available for purchase',
        'subscription_not_purchasable'
      );
    }
    
    // Sprawdź czy są dostępne miejsca
    if (subscription.slotsAvailable <= 0) {
      throw new BusinessRuleViolationException(
        'No slots available for this subscription',
        'no_slots_available'
      );
    }
    
    // Przetwórz transakcję zakupu
    const transactionResult = await this.transactionService.processPurchaseTransaction(
      request.userId,
      request.subscriptionId,
      request.paymentMethod,
      subscription.pricePerSlot.currency
    );
    
    // Utwórz sesję płatności
    const paymentSession = await this.paymentGatewayService.createPaymentSession({
      transactionId: transactionResult.transactionId,
      amount: transactionResult.amount,
      currency: subscription.pricePerSlot.currency,
      paymentMethod: request.paymentMethod,
      description: `Zakup miejsca w subskrypcji ${subscription.platformName}`,
      metadata: {
        purchaseId: transactionResult.purchaseId,
        subscriptionId: request.subscriptionId,
        userId: request.userId
      }
    });
    
    // Przygotuj odpowiedź
    const response = new PurchaseSubscriptionSlotResponseDTO();
    response.purchaseId = transactionResult.purchaseId;
    response.transactionId = transactionResult.transactionId;
    response.amount = transactionResult.amount;
    response.currency = subscription.pricePerSlot.currency;
    response.status = transactionResult.status;
    response.paymentUrl = paymentSession.paymentUrl;
    
    return response;
  }
}

module.exports = {
  PurchaseSubscriptionSlotUseCase,
  PurchaseSubscriptionSlotRequestDTO,
  PurchaseSubscriptionSlotResponseDTO
};