const BaseUseCase = require('../../BaseUseCase');
const { AuthorizationException, ValidationException } = require('../../../exceptions');
const BaseDTO = require('../../../dtos/BaseDTO');

// DTO Żądania
class CreateSubscriptionRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.groupId = null;
    this.platformId = null;
    this.slotsTotal = null;
    this.pricePerSlot = null;
    this.currency = 'PLN';
    this.accessInstructions = null;
    this.userId = null; // ID użytkownika wykonującego akcję
  }
}

// DTO Odpowiedzi
class CreateSubscriptionResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.id = null;
    this.groupId = null;
    this.platformId = null;
    this.status = null;
    this.slotsTotal = null;
    this.slotsAvailable = null;
    this.pricePerSlot = null;
    this.currency = null;
    this.createdAt = null;
  }
}

/**
 * Przypadek użycia tworzenia nowej oferty subskrypcji
 */
class CreateSubscriptionUseCase extends BaseUseCase {
  constructor(
    subscriptionRepository,
    groupRepository,
    platformRepository,
    authorizationService,
    accessInstructionService
  ) {
    super();
    this.subscriptionRepository = subscriptionRepository;
    this.groupRepository = groupRepository;
    this.platformRepository = platformRepository;
    this.authorizationService = authorizationService;
    this.accessInstructionService = accessInstructionService;
  }
  
  /**
   * Waliduje żądanie
   * @param {CreateSubscriptionRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.groupId) {
      errors.groupId = 'Group ID is required';
    }
    
    if (!request.platformId) {
      errors.platformId = 'Platform ID is required';
    }
    
    if (!request.slotsTotal || request.slotsTotal <= 0) {
      errors.slotsTotal = 'Number of slots must be greater than zero';
    }
    
    if (!request.pricePerSlot || request.pricePerSlot <= 0) {
      errors.pricePerSlot = 'Price per slot must be greater than zero';
    }
    
    if (!request.accessInstructions || request.accessInstructions.trim().length < 10) {
      errors.accessInstructions = 'Access instructions must be at least 10 characters long';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Sprawdza uprawnienia
   * @param {CreateSubscriptionRequestDTO} request Żądanie
   * @throws {AuthorizationException} Gdy brak uprawnień
   */
  async authorize(request) {
    const hasPermission = await this.authorizationService.hasGroupPermission(
      request.userId,
      request.groupId,
      'admin'
    );
    
    if (!hasPermission) {
      throw new AuthorizationException(
        'You do not have permission to create subscription for this group',
        'group_admin'
      );
    }
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {CreateSubscriptionRequestDTO} request Żądanie
   * @returns {Promise<CreateSubscriptionResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz grupę i platformę
    const group = await this.groupRepository.findById(request.groupId);
    const platform = await this.platformRepository.findById(request.platformId);
    
    // Stwórz nową subskrypcję w domenie
    const subscription = Subscription.create(
      Id.create(),
      request.groupId,
      request.platformId,
      request.slotsTotal,
      request.pricePerSlot,
      request.currency
    );
    
    // Zapisz subskrypcję
    await this.subscriptionRepository.save(subscription);
    
    // Zapisz instrukcje dostępu
    await this.accessInstructionService.saveAccessInstructions(
      subscription.id,
      request.accessInstructions
    );
    
    // Przygotuj odpowiedź
    const response = new CreateSubscriptionResponseDTO();
    response.id = subscription.id;
    response.groupId = subscription.groupId;
    response.platformId = subscription.platformId;
    response.status = subscription.status.toString();
    response.slotsTotal = subscription.slotsTotal;
    response.slotsAvailable = subscription.slotsAvailable;
    response.pricePerSlot = subscription.pricePerSlot.amount;
    response.currency = subscription.pricePerSlot.currency;
    response.createdAt = subscription.createdAt.toISOString();
    
    return response;
  }
}

module.exports = {
  CreateSubscriptionUseCase,
  CreateSubscriptionRequestDTO,
  CreateSubscriptionResponseDTO
};