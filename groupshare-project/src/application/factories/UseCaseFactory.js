// src/application/factories/UseCaseFactory.js

const UnitOfWorkFactory = require('./UnitOfWorkFactory');
const EventPublisher = require('../services/EventPublisher');
const DTOMappingService = require('../services/DTOMappingService');
const TransactionService = require('../services/TransactionService');
const AuthorizationService = require('../services/AuthorizationService');
const TokenService = require('../services/TokenService');
const AccessInstructionService = require('../services/AccessInstructionService');

// Importy repozytoriów i zapytań
const UserRepository = require('../../infrastructure/repositories/SupabaseUserRepository');
const GroupRepository = require('../../infrastructure/repositories/SupabaseGroupRepository');
const SubscriptionRepository = require('../../infrastructure/persistence/supabase/SupabaseSubscriptionRepository');
const PurchaseRepository = require('../../infrastructure/repositories/SupabasePurchaseRepository');
const TransactionRepository = require('../../infrastructure/repositories/SupabaseTransactionRepository');
const PlatformRepository = require('../../infrastructure/repositories/SupabasePlatformRepository');
const AccessInstructionRepository = require('../../infrastructure/repositories/SupabaseAccessInstructionRepository');
const AccessTokenRepository = require('../../infrastructure/repositories/SupabaseAccessTokenRepository');

const SubscriptionQueries = require('../../infrastructure/queries/supabase/SupabaseSubscriptionQueries');
const PurchaseQueries = require('../../infrastructure/queries/supabase/SupabasePurchaseQueries');
const UserQueries = require('../../infrastructure/queries/supabase/SupabaseUserQueries');
const GroupQueries = require('../../infrastructure/queries/supabase/SupabaseGroupQueries');

// Importy przypadków użycia
const { 
  CreateSubscriptionUseCase,
  PurchaseSubscriptionSlotUseCase,
  ProvideAccessInstructionsUseCase,
  GetSubscriptionDetailsUseCase,
  ListAvailableSubscriptionsUseCase,
  UpdateSubscriptionUseCase
} = require('../use-cases/subscription');

const { 
  CreateGroupUseCase,
  JoinGroupUseCase,
  LeaveGroupUseCase,
  UpdateGroupUseCase,
  ListUserGroupsUseCase
} = require('../use-cases/group');

const {
  RegisterUserUseCase,
  UpdateUserProfileUseCase,
  GetUserProfileUseCase
} = require('../use-cases/user');

const {
  ProcessPaymentUseCase,
  RefundPaymentUseCase
} = require('../use-cases/payment');

const {
  ValidateAccessTokenUseCase,
  ConfirmAccessUseCase,
  ReportAccessProblemUseCase
} = require('../use-cases/access');

// Importy serwisów infrastruktury
const supabaseClient = require('../../lib/database/supabase-client').supabaseClient;
const supabaseAdmin = require('../../lib/database/supabase-admin-client');
const paymentGatewayService = require('../../services/payment/payment-gateway-service');

/**
 * Fabryka przypadków użycia
 */
class UseCaseFactory {
  // Prywatne pola dla repozytoriów, zapytań i serwisów
  static #repositories = null;
  static #queries = null;
  static #services = null;
  
  /**
   * Inicjalizuje repozytoria
   * @private
   */
  static #initializeRepositories() {
    if (this.#repositories) return;
    
    this.#repositories = {
      user: new UserRepository(supabaseClient),
      group: new GroupRepository(supabaseClient),
      subscription: new SubscriptionRepository(supabaseClient),
      purchase: new PurchaseRepository(supabaseClient),
      transaction: new TransactionRepository(supabaseClient),
      platform: new PlatformRepository(supabaseClient),
      accessInstruction: new AccessInstructionRepository(supabaseClient),
      accessToken: new AccessTokenRepository(supabaseClient)
    };
  }
  
  /**
   * Inicjalizuje zapytania
   * @private
   */
  static #initializeQueries() {
    if (this.#queries) return;
    
    this.#queries = {
      subscription: new SubscriptionQueries(supabaseClient),
      purchase: new PurchaseQueries(supabaseClient),
      user: new UserQueries(supabaseClient),
      group: new GroupQueries(supabaseClient)
    };
  }
  
  /**
   * Inicjalizuje serwisy
   * @private
   */
  static #initializeServices() {
    if (this.#services) return;
    
    this.#initializeRepositories();
    
    // Utwórz fabrykę Unit of Work
    const unitOfWorkFactory = new UnitOfWorkFactory(
      supabaseClient,
      this.#repositories
    );
    
    // Utwórz publisher zdarzeń domenowych
    const eventPublisher = new EventPublisher();
    
    // Inicjalizuj serwisy
    this.#services = {
      unitOfWorkFactory,
      eventPublisher,
      transaction: new TransactionService(
        unitOfWorkFactory,
        eventPublisher
      ),
      authorization: new AuthorizationService(
        this.#repositories.user,
        this.#repositories.group
      ),
      token: new TokenService(
        this.#repositories.accessToken
      ),
      accessInstruction: new AccessInstructionService(
        this.#repositories.accessInstruction
      ),
      dtoMapping: new DTOMappingService(
        this.#repositories.user,
        this.#repositories.group,
        this.#repositories.platform,
        this.#repositories.accessInstruction
      ),
      payment: paymentGatewayService
    };
    
    // Zarejestruj handlery zdarzeń
    this.#registerEventHandlers(eventPublisher);
  }
  
  /**
   * Rejestruje handlery zdarzeń
   * @private
   * @param {EventPublisher} eventPublisher - Publisher zdarzeń
   */
  static #registerEventHandlers(eventPublisher) {
    // Rejestracja handlerów dla zdarzeń
    eventPublisher.registerHandler('PurchaseCompletedEvent', async (event) => {
      console.log(`Purchase completed: ${event.purchaseId}`);
      // Logika obsługi zdarzenia
    });
    
    eventPublisher.registerHandler('SlotsPurchasedEvent', async (event) => {
      console.log(`Slots purchased: ${event.slotsPurchased} for subscription ${event.subscriptionId}`);
      // Logika obsługi zdarzenia
    });
    
    // ... rejestracja innych handlerów
  }
  
  /**
   * Pobiera repozytorium użytkowników
   * @returns {UserRepository} Repozytorium użytkowników
   */
  static getUserRepository() {
    this.#initializeRepositories();
    return this.#repositories.user;
  }
  
  /**
   * Pobiera przypadek użycia tworzenia subskrypcji
   * @returns {CreateSubscriptionUseCase} Przypadek użycia
   */
  static getCreateSubscriptionUseCase() {
    this.#initializeServices();
    
    return new CreateSubscriptionUseCase(
      this.#repositories.subscription,
      this.#repositories.group,
      this.#repositories.platform,
      this.#services.authorization,
      this.#services.accessInstruction
    );
  }
  
  /**
   * Pobiera przypadek użycia zakupu subskrypcji
   * @returns {PurchaseSubscriptionSlotUseCase} Przypadek użycia
   */
  static getPurchaseSubscriptionSlotUseCase() {
    this.#initializeServices();
    
    return new PurchaseSubscriptionSlotUseCase(
      this.#services.unitOfWorkFactory,
      this.#services.transaction,
      this.#services.payment,
      this.#services.eventPublisher
    );
  }
  
  /**
   * Pobiera przypadek użycia dostarczania instrukcji dostępu
   * @returns {ProvideAccessInstructionsUseCase} Przypadek użycia
   */
  static getProvideAccessInstructionsUseCase() {
    this.#initializeServices();
    
    return new ProvideAccessInstructionsUseCase(
      this.#repositories.purchase,
      this.#services.accessInstruction,
      this.#services.token,
      this.#services.authorization
    );
  }
  
  /**
   * Pobiera przypadek użycia pobierania szczegółów subskrypcji
   * @returns {GetSubscriptionDetailsUseCase} Przypadek użycia
   */
  static getGetSubscriptionDetailsUseCase() {
    this.#initializeServices();
    this.#initializeQueries();
    
    return new GetSubscriptionDetailsUseCase(
      this.#queries.subscription,
      this.#services.dtoMapping
    );
  }
  
  /**
   * Pobiera przypadek użycia listowania dostępnych subskrypcji
   * @returns {ListAvailableSubscriptionsUseCase} Przypadek użycia
   */
  static getListAvailableSubscriptionsUseCase() {
    this.#initializeServices();
    this.#initializeQueries();
    
    return new ListAvailableSubscriptionsUseCase(
      this.#queries.subscription,
      this.#services.dtoMapping
    );
  }
  
  /**
   * Pobiera przypadek użycia aktualizacji subskrypcji
   * @returns {UpdateSubscriptionUseCase} Przypadek użycia
   */
  static getUpdateSubscriptionUseCase() {
    this.#initializeServices();
    
    return new UpdateSubscriptionUseCase(
      this.#repositories.subscription,
      this.#services.authorization,
      this.#services.accessInstruction
    );
  }
  
  /**
   * Pobiera przypadek użycia tworzenia grupy
   * @returns {CreateGroupUseCase} Przypadek użycia
   */
  static getCreateGroupUseCase() {
    this.#initializeServices();
    
    return new CreateGroupUseCase(
      this.#repositories.group,
      this.#repositories.user
    );
  }
  
  /**
   * Pobiera przypadek użycia dołączania do grupy
   * @returns {JoinGroupUseCase} Przypadek użycia
   */
  static getJoinGroupUseCase() {
    this.#initializeServices();
    
    return new JoinGroupUseCase(
      this.#repositories.group,
      this.#repositories.user,
      this.#repositories.groupInvitation
    );
  }
  
  /**
   * Pobiera przypadek użycia pobierania grup użytkownika
   * @returns {ListUserGroupsUseCase} Przypadek użycia
   */
  static getListUserGroupsUseCase() {
    this.#initializeServices();
    this.#initializeQueries();
    
    return new ListUserGroupsUseCase(
      this.#queries.group,
      this.#services.dtoMapping
    );
  }
  
  /**
   * Pobiera przypadek użycia potwierdzania dostępu
   * @returns {ConfirmAccessUseCase} Przypadek użycia
   */
  static getConfirmAccessUseCase() {
    this.#initializeServices();
    
    return new ConfirmAccessUseCase(
      this.#repositories.purchase,
      this.#repositories.subscription,
      this.#services.authorization,
      this.#services.eventPublisher
    );
  }
  
  // ... inne metody fabryczne dla pozostałych przypadków użycia
}

module.exports = UseCaseFactory;