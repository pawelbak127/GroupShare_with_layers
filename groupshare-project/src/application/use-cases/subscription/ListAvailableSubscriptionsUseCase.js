const BaseUseCase = require('../../BaseUseCase');
const BaseDTO = require('../../../dtos/BaseDTO');

// DTO Żądania
class ListAvailableSubscriptionsRequestDTO extends BaseDTO {
  constructor() {
    super();
    this.platformId = null;
    this.minPrice = null;
    this.maxPrice = null;
    this.availableSlots = true;
    this.orderBy = 'created_at';
    this.ascending = false;
    this.page = 1;
    this.limit = 20;
  }
}

// DTO Odpowiedzi
class SubscriptionDTO extends BaseDTO {
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
      rating: null,
      verificationLevel: null
    };
    this.createdAt = null;
  }
}

class ListAvailableSubscriptionsResponseDTO extends BaseDTO {
  constructor() {
    super();
    this.items = [];
    this.totalCount = 0;
    this.page = 1;
    this.limit = 20;
    this.totalPages = 1;
  }
}

/**
 * Przypadek użycia pobierania dostępnych subskrypcji
 */
class ListAvailableSubscriptionsUseCase extends BaseUseCase {
  constructor(subscriptionRepository, platformRepository) {
    super();
    this.subscriptionRepository = subscriptionRepository;
    this.platformRepository = platformRepository;
  }
  
  /**
   * Waliduje żądanie
   * @param {ListAvailableSubscriptionsRequestDTO} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    const errors = {};
    
    if (request.minPrice !== null && request.minPrice < 0) {
      errors.minPrice = 'Minimum price cannot be negative';
    }
    
    if (request.maxPrice !== null && request.maxPrice < 0) {
      errors.maxPrice = 'Maximum price cannot be negative';
    }
    
    if (request.minPrice !== null && request.maxPrice !== null && request.minPrice > request.maxPrice) {
      errors.price = 'Minimum price cannot be greater than maximum price';
    }
    
    if (request.page !== null && request.page < 1) {
      errors.page = 'Page must be at least 1';
    }
    
    if (request.limit !== null && (request.limit < 1 || request.limit > 100)) {
      errors.limit = 'Limit must be between 1 and 100';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
  
  /**
   * Implementacja przypadku użycia
   * @param {ListAvailableSubscriptionsRequestDTO} request Żądanie
   * @returns {Promise<ListAvailableSubscriptionsResponseDTO>} Odpowiedź
   */
  async executeImpl(request) {
    // Przygotuj filtry
    const filters = {
      platformId: request.platformId,
      minPrice: request.minPrice,
      maxPrice: request.maxPrice,
      availableSlots: request.availableSlots,
      status: 'active'
    };
    
    // Przygotuj opcje paginacji
    const pagination = {
      page: request.page || 1,
      limit: request.limit || 20,
      orderBy: request.orderBy || 'created_at',
      ascending: request.ascending || false
    };
    
    // Pobierz dane
    const result = await this.subscriptionRepository.findWithFilters(filters, pagination);
    
    // Przygotuj odpowiedź
    const response = new ListAvailableSubscriptionsResponseDTO();
    response.items = await Promise.all(result.items.map(async subscription => {
      const platform = await this.platformRepository.findById(subscription.platformId);
      const group = await this.groupRepository.findById(subscription.groupId);
      const owner = await this.userRepository.findById(group.ownerId);
      
      const dto = new SubscriptionDTO();
      dto.id = subscription.id;
      dto.groupId = subscription.groupId;
      dto.groupName = group.name;
      dto.platformId = subscription.platformId;
      dto.platformName = platform.name;
      dto.platformIcon = platform.icon;
      dto.status = subscription.status.toString();
      dto.slotsTotal = subscription.slotsTotal;
      dto.slotsAvailable = subscription.slotsAvailable;
      dto.pricePerSlot = subscription.pricePerSlot.amount;
      dto.currency = subscription.pricePerSlot.currency;
      dto.owner = {
        id: owner.id,
        displayName: owner.displayName,
        rating: owner.ratingAvg,
        verificationLevel: owner.verificationLevel.toString()
      };
      dto.createdAt = subscription.createdAt.toISOString();
      
      return dto;
    }));
    
    response.totalCount = result.totalCount;
    response.page = pagination.page;
    response.limit = pagination.limit;
    response.totalPages = Math.ceil(result.totalCount / pagination.limit);
    
    return response;
  }
}

module.exports = {
  ListAvailableSubscriptionsUseCase,
  ListAvailableSubscriptionsRequestDTO,
  ListAvailableSubscriptionsResponseDTO,
  SubscriptionDTO
};