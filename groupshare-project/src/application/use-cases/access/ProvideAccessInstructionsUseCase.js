// src/application/use-cases/access/ProvideAccessInstructionsUseCase.js

const BaseUseCase = require('../../BaseUseCase');
const { AuthorizationException, ResourceNotFoundException } = require('../../exceptions');
const BaseDTO = require('../../dtos/BaseDTO');

// DTO Żądania
class ProvideAccessInstructionsRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.purchaseId = null;
    this.userId = null; // Użytkownik żądający dostępu
    this.token = null;
  }
}

// DTO Odpowiedzi
class ProvideAccessInstructionsResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.purchaseId = null;
    this.platform = null;
    this.instructions = null;
    this.purchasedAt = null;
    this.ownerContact = null;
    this.hasInstructions = false;
  }
}

/**
 * Przypadek użycia dostarczania instrukcji dostępu
 */
class ProvideAccessInstructionsUseCase extends BaseUseCase {
  constructor(
    purchaseRepository,
    accessInstructionService,
    tokenService,
    authorizationService
  ) {
    super();
    this.purchaseRepository = purchaseRepository;
    this.accessInstructionService = accessInstructionService;
    this.tokenService = tokenService;
    this.authorizationService = authorizationService;
  }
  
  /**
   * Waliduje żądanie
   * @param {ProvideAccessInstructionsRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.purchaseId) {
      errors.purchaseId = 'Purchase ID is required';
    }
    
    // Albo token albo zalogowany użytkownik jest wymagany
    if (!request.token && !request.userId) {
      errors.token = 'Either token or authenticated user is required';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Sprawdza uprawnienia
   * @param {ProvideAccessInstructionsRequestDTO} request Żądanie
   * @throws {AuthorizationException} Gdy brak uprawnień
   */
  async authorize(request) {
    // Jeśli użytkownik jest zalogowany, sprawdź czy ma dostęp do zakupu
    if (request.userId && !request.token) {
      const hasPermission = await this.authorizationService.hasPurchasePermission(
        request.userId,
        request.purchaseId
      );
      
      if (!hasPermission) {
        throw new AuthorizationException(
          'You do not have permission to access this purchase',
          'purchase_owner'
        );
      }
    }
    
    // Jeśli używany jest token, będzie zweryfikowany w executeImpl
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {ProvideAccessInstructionsRequestDTO} request Żądanie
   * @returns {Promise<ProvideAccessInstructionsResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz zakup
    const purchase = await this.purchaseRepository.findById(request.purchaseId);
    
    if (!purchase) {
      throw new ResourceNotFoundException('Purchase not found', 'purchase', request.purchaseId);
    }
    
    let tokenVerified = false;
    
    // Jeśli podano token, zweryfikuj go
    if (request.token) {
      try {
        const token = await this.tokenService.verifyAccessToken(
          request.purchaseId,
          request.token
        );
        
        // Oznacz token jako użyty
        await this.tokenService.markTokenAsUsed(
          token.id,
          request.ipAddress,
          request.userAgent
        );
        
        tokenVerified = true;
      } catch (error) {
        // Jeśli token jest nieprawidłowy, a użytkownik nie jest zalogowany, zwróć błąd
        if (!request.userId) {
          throw error;
        }
        // W przeciwnym razie kontynuuj, ponieważ zalogowany użytkownik został już zweryfikowany
      }
    }
    
    // Sprawdź domenową logikę czy instrukcje mogą być pokazane
    if (!(tokenVerified || purchase.canUserViewInstructions(request.userId))) {
      throw new AuthorizationException(
        'Access to instructions not permitted',
        'instructions_access_denied'
      );
    }
    
    // Sprawdź czy zakup ma dostępne instrukcje
    if (!purchase.hasAccessInstructions()) {
      throw new BusinessRuleViolationException(
        'Access instructions are not available for this purchase',
        'no_instructions_available'
      );
    }
    
    // Pobierz subskrypcję i jej szczegóły
    const subscription = await this.subscriptionRepository.findById(purchase.subscriptionId);
    const platform = await this.platformRepository.findById(subscription.platformId);
    
    // Pobierz właściciela grupy
    const group = await this.groupRepository.findById(subscription.groupId);
    const owner = await this.userRepository.findById(group.ownerId);
    
    // Pobierz instrukcje dostępu
    let instructionsText = '';
    let hasInstructions = false;
    
    try {
      instructionsText = await this.accessInstructionService.getAccessInstructionsForPurchase(
        request.purchaseId
      );
      hasInstructions = true;
    } catch (error) {
      // Jeśli nie znaleziono instrukcji, zwróć domyślną wiadomość
      instructionsText = 'Instrukcje dostępu nie zostały jeszcze skonfigurowane przez sprzedawcę. ' +
        'Prosimy o kontakt ze sprzedawcą, aby uzyskać dane dostępowe.';
    }
    
    // Przygotuj odpowiedź
    const response = new ProvideAccessInstructionsResponseDTO();
    response.purchaseId = purchase.id;
    response.platform = platform.name;
    response.instructions = instructionsText;
    response.purchasedAt = purchase.createdAt.toISOString();
    response.ownerContact = {
      displayName: owner.displayName,
      email: owner.email
    };
    response.hasInstructions = hasInstructions;
    
    return response;
  }
}

module.exports = {
  ProvideAccessInstructionsUseCase,
  ProvideAccessInstructionsRequestDTO,
  ProvideAccessInstructionsResponseDTO
};