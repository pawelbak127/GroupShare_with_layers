const BaseUseCase = require('../../BaseUseCase');
const { ResourceNotFoundException } = require('../../../exceptions');
const BaseDTO = require('../../../dtos/BaseDTO');

// DTO Żądania
class GetSubscriptionDetailsRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.subscriptionId = null;
  }
}

// DTO Odpowiedzi
class GetSubscriptionDetailsResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.id = null;
    this.groupId = null;
    this.groupName = null;
    this.platformId = null;
    this.platformName = null;
    this.platformIcon = null;
    this.status = null;
    this.slotsTotal = null;
    this.slotsAvailable = null;
    this.pricePerSlot = null;
    this.currency = null;
    this.owner = {
      id: null,
      displayName: null,
      avatarUrl: null,
      rating: null,
      verificationLevel: null
    };
    this.createdAt = null;
    this.updatedAt = null;
    this.hasAccessInstructions = false;
  }
}

/**
 * Przypadek użycia pobierania szczegółów subskrypcji
 */
class GetSubscriptionDetailsUseCase extends BaseUseCase {
  constructor(
    subscriptionRepository,
    groupRepository,
    platformRepository,
    userRepository,
    accessInstructionRepository
  ) {
    super();
    this.subscriptionRepository = subscriptionRepository;
    this.groupRepository = groupRepository;
    this.platformRepository = platformRepository;
    this.userRepository = userRepository;
    this.accessInstructionRepository = accessInstructionRepository;
  }
  
  /**
   * Waliduje żądanie
   * @param {GetSubscriptionDetailsRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (!request.subscriptionId) {
      errors.subscriptionId = 'Subscription ID is required';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {GetSubscriptionDetailsRequestDTO} request Żądanie
   * @returns {Promise<GetSubscriptionDetailsResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Pobierz subskrypcję
    const subscription = await this.subscriptionRepository.findById(request.subscriptionId);
    
    if (!subscription) {
      throw new ResourceNotFoundException('Subscription not found', 'subscription', request.subscriptionId);
    }
    
    // Pobierz powiązane dane
    const group = await this.groupRepository.findById(subscription.groupId);
    const platform = await this.platformRepository.findById(subscription.platformId);
    const owner = await this.userRepository.findById(group.ownerId);
    
    // Sprawdź czy subskrypcja ma instrukcje dostępu
    const hasAccessInstructions = await this.accessInstructionRepository.exists(request.subscriptionId);
    
    // Przygotuj odpowiedź
    const response = new GetSubscriptionDetailsResponseDTO();
    response.id = subscription.id;
    response.groupId = subscription.groupId;
    response.groupName = group.name;
    response.platformId = subscription.platformId;
    response.platformName = platform.name;
    response.platformIcon = platform.icon;
    response.status = subscription.status.toString();
    response.slotsTotal = subscription.slotsTotal;
    response.slotsAvailable = subscription.slotsAvailable;
    response.pricePerSlot = subscription.pricePerSlot.amount;
    response.currency = subscription.pricePerSlot.currency;
    response.owner = {
      id: owner.id,
      displayName: owner.displayName,
      avatarUrl: owner.avatarUrl,
      rating: owner.ratingAvg,
      verificationLevel: owner.verificationLevel.toString()
    };
    response.createdAt = subscription.createdAt.toISOString();
    response.updatedAt = subscription.updatedAt.toISOString();
    response.hasAccessInstructions = hasAccessInstructions;
    
    return response;
  }
}

module.exports = {
  GetSubscriptionDetailsUseCase,
  GetSubscriptionDetailsRequestDTO,
  GetSubscriptionDetailsResponseDTO
};