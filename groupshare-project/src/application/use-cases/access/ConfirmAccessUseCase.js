const BaseUseCase = require('../../BaseUseCase');
const { 
  ResourceNotFoundException, 
  AuthorizationException,
  BusinessRuleViolationException 
} = require('../../../exceptions');
const BaseDTO = require('../../../dtos/BaseDTO');

// DTO Żądania
class ConfirmAccessRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.purchaseId = null;
    this.userId = null;
    this.isWorking = true;
  }
}

// DTO Odpowiedzi
class ConfirmAccessResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.confirmed = false;
    this.disputeCreated = false;
    this.disputeId = null;
    this.message = null;
  }
}

/**
 * Przypadek użycia potwierdzenia dostępu
 */
class ConfirmAccessUseCase extends BaseUseCase {
  constructor(
    purchaseRepository,
    subscriptionRepository,
    authorizationService,
    notificationService,
    disputeService
  ) {
    super();
    this.purchaseRepository = purchaseRepository;
    this.subscriptionRepository = subscriptionRepository;
    this.authorizationService = authorizationService;
    this.notificationService = notificationService;
    this.disputeService = disputeService;
  }
  
  /**
   * Waliduje żądanie
   * @param {ConfirmAccessRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.purchaseId) {
      errors.purchaseId = 'Purchase ID is required';
    }
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    if (request.isWorking === undefined || request.isWorking === null) {
      errors.isWorking = 'isWorking field must be a boolean value';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Sprawdza uprawnienia
   * @param {ConfirmAccessRequestDTO} request Żądanie
   * @throws {AuthorizationException} Gdy brak uprawnień
   */
  async authorize(request) {
    const hasPermission = await this.authorizationService.hasPurchasePermission(
      request.userId,
      request.purchaseId
    );
    
    if (!hasPermission) {
      throw new AuthorizationException(
        'You can only confirm your own purchases',
        'purchase_owner'
      );
    }
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {ConfirmAccessRequestDTO} request Żądanie
   * @returns {Promise<ConfirmAccessResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz zakup
    const purchase = await this.purchaseRepository.findById(request.purchaseId);
    
    if (!purchase) {
      throw new ResourceNotFoundException('Purchase not found', 'purchase', request.purchaseId);
    }
    
    // Sprawdź czy dostęp został przyznany
    if (!purchase.accessProvided) {
      throw new BusinessRuleViolationException(
        'Access has not been provided yet',
        'access_not_provided'
      );
    }
    
    // Potwierdź dostęp
    purchase.confirmAccess();
    await this.purchaseRepository.save(purchase);
    
    const response = new ConfirmAccessResponseDTO();
    response.confirmed = true;
    
    // Jeśli dostęp nie działa, utwórz spór
    if (!request.isWorking) {
      // Pobierz informacje o subskrypcji
      const subscription = await this.subscriptionRepository.findById(purchase.subscriptionId);
      const group = await this.groupRepository.findById(subscription.groupId);
      
      // Utwórz spór
      const dispute = await this.disputeService.createDispute({
        reporterId: request.userId,
        reportedEntityType: 'subscription',
        reportedEntityId: purchase.subscriptionId,
        transactionId: purchase.transaction.id,
        disputeType: 'access',
        description: 'Automatyczne zgłoszenie: problem z dostępem do subskrypcji',
        evidenceRequired: true
      });
      
      // Wyślij powiadomienia
      await this.notificationService.sendAccessProblemNotification(
        request.userId,
        group.ownerId,
        dispute.id,
        subscription.platformName
      );
      
      response.disputeCreated = true;
      response.disputeId = dispute.id;
      response.message = 'Access confirmation and dispute filed successfully';
    } else {
      response.message = 'Access confirmed successfully';
    }
    
    return response;
  }
}

module.exports = {
  ConfirmAccessUseCase,
  ConfirmAccessRequestDTO,
  ConfirmAccessResponseDTO
};