// src/application/factories/UseCaseFactory.js

import { 
    CreateSubscriptionUseCase,
    PurchaseSubscriptionSlotUseCase,
    ProvideAccessInstructionsUseCase,
    GetSubscriptionDetailsUseCase,
    ListAvailableSubscriptionsUseCase
  } from '../use-cases/subscription';
  
  import { 
    CreateGroupUseCase,
    JoinGroupUseCase,
    LeaveGroupUseCase,
    UpdateGroupUseCase,
    ListUserGroupsUseCase
  } from '../use-cases/group';
  
  import {
    RegisterUserUseCase,
    UpdateUserProfileUseCase,
    GetUserProfileUseCase
  } from '../use-cases/user';
  
  import {
    ProcessPaymentUseCase,
    RefundPaymentUseCase
  } from '../use-cases/payment';
  
  import {
    ValidateAccessTokenUseCase,
    ConfirmAccessUseCase,
    ReportAccessProblemUseCase
  } from '../use-cases/access';
  
  import {
    AuthorizationService,
    NotificationService,
    TransactionService,
    AccessInstructionService,
    TokenService
  } from '../services';
  
  /**
   * Fabryka przypadków użycia
   */
  export class UseCaseFactory {
    // Prywatne pola dla repozytoriów
    static #repositories = null;
    
    // Prywatne pola dla serwisów
    static #services = null;
    
    /**
     * Inicjalizuje repozytoria
     * @private
     */
    static #initializeRepositories() {
      if (this.#repositories) return;
      
      this.#repositories = {
        user: new UserRepositoryImpl(),
        group: new GroupRepositoryImpl(),
        subscription: new SubscriptionRepositoryImpl(),
        purchase: new PurchaseRepositoryImpl(),
        transaction: new TransactionRepositoryImpl(),
        platform: new PlatformRepositoryImpl(),
        accessInstruction: new AccessInstructionRepositoryImpl(),
        accessToken: new AccessTokenRepositoryImpl(),
        encryption: new EncryptionKeyRepositoryImpl(),
        notification: new NotificationRepositoryImpl(),
        dispute: new DisputeRepositoryImpl(),
        groupInvitation: new GroupInvitationRepositoryImpl()
      };
    }
    
    /**
     * Inicjalizuje serwisy
     * @private
     */
    static #initializeServices() {
      if (this.#services) return;
      
      this.#initializeRepositories();
      
      this.#services = {
        authorization: new AuthorizationService(
          this.#repositories.user,
          this.#repositories.group
        ),
        notification: new NotificationService(
          this.#repositories.notification,
          this.#repositories.user
        ),
        transaction: new TransactionService(
          this.#repositories.purchase,
          this.#repositories.subscription,
          this.#repositories.transaction
        ),
        accessInstruction: new AccessInstructionService(
          this.#repositories.encryption,
          this.#repositories.accessInstruction
        ),
        token: new TokenService(
          this.#repositories.accessToken
        ),
        payment: new PaymentGatewayService(),
        dispute: new DisputeService(
          this.#repositories.dispute
        )
      };
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
        this.#repositories.subscription,
        this.#repositories.purchase,
        this.#services.transaction,
        this.#services.payment
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
    
    // ... inne metody fabryczne dla pozostałych przypadków użycia
  }