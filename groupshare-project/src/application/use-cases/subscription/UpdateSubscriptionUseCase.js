// /src/application/use-cases/subscription/UpdateSubscriptionUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { AuthorizationException, ResourceNotFoundException, ValidationException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class UpdateSubscriptionRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.id = null;
    this.status = null;
    this.slotsTotal = null;
    this.slotsAvailable = null;
    this.pricePerSlot = null;
    this.currency = null;
    this.accessInstructions = null;
    this.userId = null; // ID użytkownika wykonującego akcję
  }
}

// DTO Odpowiedzi
class UpdateSubscriptionResponseDTO extends BaseDTO {
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
    this.updatedAt = null;
    this.accessInstructionsUpdated = false;
  }
}

/**
 * Przypadek użycia aktualizacji oferty subskrypcji
 */
class UpdateSubscriptionUseCase extends BaseUseCase {
  constructor(
    subscriptionRepository,
    authorizationService,
    accessInstructionService
  ) {
    super();
    this.subscriptionRepository = subscriptionRepository;
    this.authorizationService = authorizationService;
    this.accessInstructionService = accessInstructionService;
  }
  
  /**
   * Waliduje żądanie
   * @param {UpdateSubscriptionRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.id) {
      errors.id = 'Subscription ID is required';
    }
    
    if (!request.userId) {
      errors.userId = 'User ID is required';
    }
    
    // Walidacja tylko przekazanych pól
    if (request.slotsTotal !== undefined && request.slotsTotal !== null && request.slotsTotal <= 0) {
      errors.slotsTotal = 'Total slots must be greater than zero';
    }
    
    if (request.pricePerSlot !== undefined && request.pricePerSlot !== null && request.pricePerSlot <= 0) {
      errors.pricePerSlot = 'Price per slot must be greater than zero';
    }
    
    if (request.slotsAvailable !== undefined && request.slotsAvailable !== null && request.slotsAvailable < 0) {
      errors.slotsAvailable = 'Available slots cannot be negative';
    }
    
    // Sprawdź relację między total i available
    if (request.slotsTotal !== undefined && request.slotsTotal !== null && 
        request.slotsAvailable !== undefined && request.slotsAvailable !== null &&
        request.slotsAvailable > request.slotsTotal) {
      errors.slotsAvailable = 'Available slots cannot exceed total slots';
    }
    
    if (request.accessInstructions !== undefined && request.accessInstructions !== null && 
        request.accessInstructions.trim().length < 10) {
      errors.accessInstructions = 'Access instructions must be at least 10 characters long';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Sprawdza uprawnienia
   * @param {UpdateSubscriptionRequestDTO} request Żądanie
   * @throws {AuthorizationException} Gdy brak uprawnień
   */
  async authorize(request) {
    // Pobierz subskrypcję
    const subscription = await this.subscriptionRepository.findById(request.id);
    
    if (!subscription) {
      throw new ResourceNotFoundException('Subscription not found', 'subscription', request.id);
    }
    
    // Sprawdź uprawnienia do grupy
    const hasPermission = await this.authorizationService.hasGroupPermission(
      request.userId,
      subscription.groupId,
      'admin'
    );
    
    if (!hasPermission) {
      throw new AuthorizationException(
        'You do not have permission to update this subscription',
        'group_admin'
      );
    }
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {UpdateSubscriptionRequestDTO} request Żądanie
   * @returns {Promise<UpdateSubscriptionResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz subskrypcję
    const subscription = await this.subscriptionRepository.findById(request.id);
    
    // Przygotuj zmiany
    const changes = {};
    
    if (request.status !== undefined && request.status !== null) {
      changes.status = request.status;
    }
    
    if (request.slotsTotal !== undefined && request.slotsTotal !== null) {
      changes.slotsTotal = request.slotsTotal;
    }
    
    if (request.slotsAvailable !== undefined && request.slotsAvailable !== null) {
      changes.slotsAvailable = request.slotsAvailable;
    }
    
    if (request.pricePerSlot !== undefined && request.pricePerSlot !== null) {
      changes.pricePerSlot = request.pricePerSlot;
      
      if (request.currency) {
        changes.currency = request.currency;
      }
    }
    
    // Zaktualizuj subskrypcję
    subscription.update(changes);
    await this.subscriptionRepository.save(subscription);
    
    // Flaga czy instrukcje dostępu zostały zaktualizowane
    let accessInstructionsUpdated = false;
    
    // Jeśli przekazano instrukcje dostępu, zaktualizuj je
    if (request.accessInstructions !== undefined && request.accessInstructions !== null) {
      await this.accessInstructionService.saveAccessInstructions(
        subscription.id,
        request.accessInstructions
      );
      
      accessInstructionsUpdated = true;
    }
    
    // Przygotuj odpowiedź
    const response = new UpdateSubscriptionResponseDTO();
    response.id = subscription.id;
    response.groupId = subscription.groupId;
    response.platformId = subscription.platformId;
    response.status = subscription.status.toString();
    response.slotsTotal = subscription.slotsTotal;
    response.slotsAvailable = subscription.slotsAvailable;
    response.pricePerSlot = subscription.pricePerSlot.amount;
    response.currency = subscription.pricePerSlot.currency;
    response.updatedAt = subscription.updatedAt.toISOString();
    response.accessInstructionsUpdated = accessInstructionsUpdated;
    
    return response;
  }
}

module.exports = {
  UpdateSubscriptionUseCase,
  UpdateSubscriptionRequestDTO,
  UpdateSubscriptionResponseDTO
};