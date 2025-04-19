// src/application/services/DTOMappingService.js

/**
 * Serwis odpowiedzialny za mapowanie między obiektami domeny a DTO
 */
class DTOMappingService {
    /**
     * @param {UserRepository} userRepository - Repozytorium użytkowników
     * @param {GroupRepository} groupRepository - Repozytorium grup
     * @param {PlatformRepository} platformRepository - Repozytorium platform
     * @param {AccessInstructionRepository} accessInstructionRepository - Repozytorium instrukcji dostępu
     */
    constructor(
      userRepository,
      groupRepository,
      platformRepository,
      accessInstructionRepository
    ) {
      this.userRepository = userRepository;
      this.groupRepository = groupRepository;
      this.platformRepository = platformRepository;
      this.accessInstructionRepository = accessInstructionRepository;
    }
    
    /**
     * Mapuje obiekt subskrypcji na DTO ze szczegółami
     * @param {Subscription} subscription - Obiekt subskrypcji
     * @param {boolean} includeDetails - Czy dołączyć szczegółowe informacje
     * @returns {Promise<SubscriptionDTO>} DTO subskrypcji
     */
    async mapSubscriptionToDTO(subscription, includeDetails = false) {
      // Pobierz podstawowe dane
      const dto = {};
      dto.id = subscription.id;
      dto.groupId = subscription.groupId;
      dto.platformId = subscription.platformId;
      dto.status = subscription.status.toString();
      dto.slotsTotal = subscription.slotsTotal;
      dto.slotsAvailable = subscription.slotsAvailable;
      dto.pricePerSlot = subscription.pricePerSlot.amount;
      dto.currency = subscription.pricePerSlot.currency;
      dto.createdAt = subscription.createdAt.toISOString();
      
      // Pobierz dodatkowe dane, jeśli potrzebne
      if (includeDetails) {
        const platform = await this.platformRepository.findById(subscription.platformId);
        const group = await this.groupRepository.findById(subscription.groupId);
        const owner = await this.userRepository.findById(group.ownerId);
        const hasAccessInstructions = await this.accessInstructionRepository.exists(subscription.id);
        
        dto.groupName = group.name;
        dto.platformName = platform.name;
        dto.platformIcon = platform.icon;
        dto.owner = this.mapUserToOwnerDTO(owner);
        dto.hasAccessInstructions = hasAccessInstructions;
        dto.updatedAt = subscription.updatedAt.toISOString();
      }
      
      return dto;
    }
    
    /**
     * Mapuje tablicę subskrypcji na tablicę DTO
     * @param {Array<Subscription>} subscriptions - Tablica subskrypcji
     * @param {boolean} includeDetails - Czy dołączyć szczegółowe informacje
     * @returns {Promise<Array<SubscriptionDTO>>} Tablica DTO subskrypcji
     */
    async mapSubscriptionsToDTO(subscriptions, includeDetails = false) {
      return Promise.all(
        subscriptions.map(subscription => this.mapSubscriptionToDTO(subscription, includeDetails))
      );
    }
    
    /**
     * Mapuje obiekt użytkownika na DTO właściciela
     * @param {User} user - Obiekt użytkownika
     * @returns {Object} DTO właściciela
     */
    mapUserToOwnerDTO(user) {
      return {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        rating: user.ratingAvg,
        verificationLevel: user.verificationLevel.toString()
      };
    }
    
    /**
     * Mapuje obiekt użytkownika na DTO profilu
     * @param {User} user - Obiekt użytkownika
     * @returns {Object} DTO profilu użytkownika
     */
    mapUserToProfileDTO(user) {
      return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        profileType: user.profileType.toString(),
        verificationLevel: user.verificationLevel.toString(),
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        ratingAvg: user.ratingAvg,
        ratingCount: user.ratingCount,
        createdAt: user.createdAt.toISOString()
      };
    }
    
    /**
     * Mapuje obiekt użytkownika na DTO podstawowych informacji
     * @param {User} user - Obiekt użytkownika
     * @returns {Object} Podstawowe DTO użytkownika
     */
    mapUserToBasicDTO(user) {
      return {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      };
    }
    
    /**
     * Mapuje obiekt zakupu na DTO
     * @param {Purchase} purchase - Obiekt zakupu
     * @param {boolean} includeDetails - Czy dołączyć szczegółowe informacje
     * @returns {Promise<Object>} DTO zakupu
     */
    async mapPurchaseToDTO(purchase, includeDetails = false) {
      const dto = {
        id: purchase.id,
        userId: purchase.userId,
        subscriptionId: purchase.subscriptionId,
        status: purchase.status.toString(),
        accessProvided: purchase.accessProvided,
        accessConfirmed: purchase.accessConfirmed,
        createdAt: purchase.createdAt.toISOString()
      };
      
      if (includeDetails) {
        // Pobierz dodatkowe informacje
        const subscription = await this.subscriptionRepository.findById(purchase.subscriptionId);
        const platform = await this.platformRepository.findById(subscription.platformId);
        
        dto.subscription = await this.mapSubscriptionToDTO(subscription, false);
        dto.platform = {
          id: platform.id,
          name: platform.name,
          icon: platform.icon
        };
        
        if (purchase.transaction) {
          dto.transaction = this.mapTransactionToDTO(purchase.transaction);
        }
      }
      
      return dto;
    }
    
    /**
     * Mapuje obiekt transakcji na DTO
     * @param {Transaction} transaction - Obiekt transakcji
     * @returns {Object} DTO transakcji
     */
    mapTransactionToDTO(transaction) {
      return {
        id: transaction.id,
        amount: transaction.amount.amount,
        currency: transaction.amount.currency,
        status: transaction.status.toString(),
        paymentMethod: transaction.paymentMethod.toString(),
        createdAt: transaction.createdAt.toISOString()
      };
    }
    
    /**
     * Mapuje obiekt grupy na DTO
     * @param {Group} group - Obiekt grupy
     * @param {boolean} includeDetails - Czy dołączyć szczegółowe informacje
     * @returns {Promise<Object>} DTO grupy
     */
    async mapGroupToDTO(group, includeDetails = false) {
      const dto = {
        id: group.id,
        name: group.name,
        description: group.description,
        ownerId: group.ownerId,
        createdAt: group.createdAt.toISOString()
      };
      
      if (includeDetails) {
        const owner = await this.userRepository.findById(group.ownerId);
        
        dto.status = group.status.toString();
        dto.owner = this.mapUserToBasicDTO(owner);
        dto.updatedAt = group.updatedAt.toISOString();
        
        // Pobierz dodatkowe dane
        const memberCount = await this.groupRepository.countMembers(group.id);
        const subscriptionCount = await this.groupRepository.countSubscriptions(group.id);
        
        dto.memberCount = memberCount;
        dto.subscriptionCount = subscriptionCount;
      }
      
      return dto;
    }
    
    /**
     * Mapuje obiekty platform na DTO
     * @param {Platform} platform - Obiekt platformy
     * @returns {Object} DTO platformy
     */
    mapPlatformToDTO(platform) {
      return {
        id: platform.id,
        name: platform.name,
        icon: platform.icon,
        active: platform.isActive
      };
    }
    
    /**
     * Mapuje tablicę platform na tablicę DTO
     * @param {Array<Platform>} platforms - Tablica platform
     * @returns {Array<Object>} Tablica DTO platform
     */
    mapPlatformsToDTO(platforms) {
      return platforms.map(platform => this.mapPlatformToDTO(platform));
    }
  }
  
  module.exports = DTOMappingService;