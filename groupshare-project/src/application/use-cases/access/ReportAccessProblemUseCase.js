// /src/application/use-cases/access/ReportAccessProblemUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { ResourceNotFoundException, AuthorizationException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');
const { Id } = require('../../../domain/shared/value-objects/Id');

// DTO Żądania
class ReportAccessProblemRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.purchaseId = null;
    this.userId = null;
    this.description = null;
    this.evidenceType = null;
    this.evidenceContent = null;
  }
}

// DTO Odpowiedzi
class ReportAccessProblemResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.disputeId = null;
    this.purchaseId = null;
    this.status = null;
    this.message = null;
    this.createdAt = null;
  }
}

/**
 * Przypadek użycia zgłaszania problemu z dostępem
 */
class ReportAccessProblemUseCase extends BaseUseCase {
  constructor(
    purchaseRepository,
    subscriptionRepository,
    disputeService,
    authorizationService,
    notificationService
  ) {
    super();
    this.purchaseRepository = purchaseRepository;
    this.subscriptionRepository = subscriptionRepository;
    this.disputeService = disputeService;
    this.authorizationService = authorizationService;
    this.notificationService = notificationService;
  }
  
  /**
   * Waliduje żądanie
   * @param {ReportAccessProblemRequestDTO} request Żądanie
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
    
    if (!request.description || request.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Sprawdza uprawnienia
   * @param {ReportAccessProblemRequestDTO} request Żądanie
   * @throws {AuthorizationException} Gdy brak uprawnień
   */
  async authorize(request) {
    const hasPermission = await this.authorizationService.hasPurchasePermission(
      request.userId,
      request.purchaseId
    );
    
    if (!hasPermission) {
      throw new AuthorizationException(
        'You can only report problems with your own purchases',
        'purchase_owner'
      );
    }
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {ReportAccessProblemRequestDTO} request Żądanie
   * @returns {Promise<ReportAccessProblemResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz zakup
    const purchase = await this.purchaseRepository.findById(request.purchaseId);
    
    if (!purchase) {
      throw new ResourceNotFoundException('Purchase not found', 'purchase', request.purchaseId);
    }
    
    // Pobierz subskrypcję
    const subscription = await this.subscriptionRepository.findById(purchase.subscriptionId);
    
    if (!subscription) {
      throw new ResourceNotFoundException('Subscription not found', 'subscription', purchase.subscriptionId);
    }
    
    // Pobierz grupę
    const group = await this.groupRepository.findById(subscription.groupId);
    
    // Utwórz spór
    const dispute = await this.disputeService.createDispute({
      id: Id.create().toString(),
      reporterId: request.userId,
      reportedEntityType: 'subscription',
      reportedEntityId: subscription.id,
      transactionId: purchase.transaction?.id,
      disputeType: 'access',
      description: request.description,
      evidenceRequired: true
    });
    
    // Jeśli podano dowody, dodaj je
    if (request.evidenceType && request.evidenceContent) {
      await this.disputeService.addEvidence(dispute.id, {
        type: request.evidenceType,
        content: request.evidenceContent,
        submittedBy: request.userId
      });
    }
    
    // Wyślij powiadomienie do właściciela grupy
    await this.notificationService.sendAccessProblemNotification(
      request.userId,
      group.ownerId,
      dispute.id,
      subscription.platformName
    );
    
    // Przygotuj odpowiedź
    const response = new ReportAccessProblemResponseDTO();
    response.disputeId = dispute.id;
    response.purchaseId = purchase.id;
    response.status = dispute.status.toString();
    response.message = 'Access problem reported successfully';
    response.createdAt = dispute.createdAt.toISOString();
    
    return response;
  }
}

module.exports = {
  ReportAccessProblemUseCase,
  ReportAccessProblemRequestDTO,
  ReportAccessProblemResponseDTO
};