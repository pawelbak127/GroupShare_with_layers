// /src/infrastructure/InfrastructureFactory.js

// Importy repozytoriów
import SupabaseUserRepository from './repositories/SupabaseUserRepository';
import SupabaseGroupRepository from './repositories/SupabaseGroupRepository';
import SupabaseSubscriptionRepository from './repositories/SupabaseSubscriptionRepository';
import SupabasePurchaseRepository from './repositories/SupabasePurchaseRepository';
import SupabaseTransactionRepository from './repositories/SupabaseTransactionRepository';
import SupabasePlatformRepository from './repositories/SupabasePlatformRepository';
import SupabaseAccessInstructionRepository from './repositories/SupabaseAccessInstructionRepository';
import SupabaseAccessTokenRepository from './repositories/SupabaseAccessTokenRepository';
import SupabaseSecurityLogRepository from './repositories/SupabaseSecurityLogRepository';
import SupabaseDisputeRepository from './repositories/SupabaseDisputeRepository';

// Importy adapterów
import EncryptionServiceAdapter from './security/encryption/EncryptionServiceAdapter';
import KeyManagementAdapter from './security/key-management/KeyManagementAdapter';
import TokenServiceAdapter from './security/token/TokenServiceAdapter';
import NotificationAdapter from './notification/NotificationAdapter';
import EmailServiceAdapter from './external-services/email/EmailServiceAdapter';
import PaymentServiceAdapter from './external-services/payment/PaymentServiceAdapter';
import { getCacheManager } from './cache/CacheManager';
import SupabaseUnitOfWorkAdapter from './persistence/supabase/SupabaseUnitOfWorkAdapter';

// Importy DI
import { getDependencyContainer } from './di/DependencyContainer';

/**
 * Fabryka komponentów infrastruktury
 * Zapewnia dostęp do wszystkich implementacji warstwy infrastruktury
 */
class InfrastructureFactory {
  /**
   * Pobiera repozytorium użytkowników
   * @returns {SupabaseUserRepository} Instancja repozytorium
   */
  static getUserRepository() {
    return new SupabaseUserRepository();
  }
  
  /**
   * Pobiera repozytorium grup
   * @returns {SupabaseGroupRepository} Instancja repozytorium
   */
  static getGroupRepository() {
    return new SupabaseGroupRepository();
  }
  
  /**
   * Pobiera repozytorium subskrypcji
   * @returns {SupabaseSubscriptionRepository} Instancja repozytorium
   */
  static getSubscriptionRepository() {
    return new SupabaseSubscriptionRepository();
  }
  
  /**
   * Pobiera repozytorium zakupów
   * @returns {SupabasePurchaseRepository} Instancja repozytorium
   */
  static getPurchaseRepository() {
    return new SupabasePurchaseRepository();
  }
  
  /**
   * Pobiera repozytorium transakcji
   * @returns {SupabaseTransactionRepository} Instancja repozytorium
   */
  static getTransactionRepository() {
    return new SupabaseTransactionRepository();
  }
  
  /**
   * Pobiera repozytorium platform
   * @returns {SupabasePlatformRepository} Instancja repozytorium
   */
  static getPlatformRepository() {
    return new SupabasePlatformRepository();
  }
  
  /**
   * Pobiera repozytorium instrukcji dostępu
   * @returns {SupabaseAccessInstructionRepository} Instancja repozytorium
   */
  static getAccessInstructionRepository() {
    return new SupabaseAccessInstructionRepository();
  }
  
  /**
   * Pobiera repozytorium tokenów dostępu
   * @returns {SupabaseAccessTokenRepository} Instancja repozytorium
   */
  static getAccessTokenRepository() {
    return new SupabaseAccessTokenRepository();
  }
  
  /**
   * Pobiera repozytorium logów bezpieczeństwa
   * @returns {SupabaseSecurityLogRepository} Instancja repozytorium
   */
  static getSecurityLogRepository() {
    return new SupabaseSecurityLogRepository();
  }
  
  /**
   * Pobiera repozytorium sporów
   * @returns {SupabaseDisputeRepository} Instancja repozytorium
   */
  static getDisputeRepository() {
    return new SupabaseDisputeRepository();
  }
  
  /**
   * Pobiera usługę szyfrowania
   * @returns {EncryptionServiceAdapter} Instancja usługi
   */
  static getEncryptionService() {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
    return new EncryptionServiceAdapter(masterKey, { algorithm: 'aes-256-gcm' });
  }
  
  /**
   * Pobiera usługę zarządzania kluczami
   * @returns {KeyManagementAdapter} Instancja usługi
   */
  static getKeyManagementService() {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
    return new KeyManagementAdapter(masterKey, { useHsm: process.env.USE_HSM === 'true' });
  }
  
  /**
   * Pobiera usługę tokenów
   * @returns {TokenServiceAdapter} Instancja usługi
   */
  static getTokenService() {
    return new TokenServiceAdapter({
      tokenSalt: process.env.TOKEN_SALT || 'default-salt',
      defaultExpiryMinutes: 30
    });
  }
  
  /**
   * Pobiera usługę powiadomień
   * @returns {NotificationAdapter} Instancja usługi
   */
  static getNotificationService() {
    return new NotificationAdapter({
      useDatabase: true,
      useToast: true,
      useEmail: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true'
    });
  }
  
  /**
   * Pobiera usługę email
   * @returns {EmailServiceAdapter} Instancja usługi
   */
  static getEmailService() {
    return new EmailServiceAdapter({
      enabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
      provider: process.env.EMAIL_PROVIDER || 'console',
      fromEmail: process.env.EMAIL_FROM || 'no-reply@groupshare.example.com'
    });
  }
  
  /**
   * Pobiera usługę płatności
   * @returns {PaymentServiceAdapter} Instancja usługi
   */
  static getPaymentService() {
    return new PaymentServiceAdapter({
      blikEnabled: true,
      cardEnabled: true,
      transferEnabled: true,
      testMode: process.env.NODE_ENV !== 'production'
    });
  }
  
  /**
   * Pobiera menedżera cache'u
   * @returns {CacheManager} Instancja menedżera
   */
  static getCacheManager() {
    return getCacheManager({
      useMemoryCache: true,
      defaultTtl: 300 // 5 minut
    });
  }
  
  /**
   * Tworzy instancję Unit of Work z repozytoriami
   * @returns {SupabaseUnitOfWorkAdapter} Instancja Unit of Work
   */
  static createUnitOfWork() {
    const repositories = {
      user: this.getUserRepository(),
      group: this.getGroupRepository(),
      subscription: this.getSubscriptionRepository(),
      purchase: this.getPurchaseRepository(),
      transaction: this.getTransactionRepository(),
      platform: this.getPlatformRepository(),
      accessInstruction: this.getAccessInstructionRepository(),
      accessToken: this.getAccessTokenRepository(),
      securityLog: this.getSecurityLogRepository(),
      dispute: this.getDisputeRepository()
    };
    
    return new SupabaseUnitOfWorkAdapter(repositories);
  }
  
  /**
   * Pobiera kontener zależności
   * @returns {DependencyContainer} Instancja kontenera
   */
  static getDependencyContainer() {
    return getDependencyContainer();
  }
  
  /**
   * Rozwiązuje zależność z kontenera DI
   * @param {string} name Nazwa zależności
   * @returns {any} Instancja zależności
   */
  static resolve(name) {
    return this.getDependencyContainer().resolve(name);
  }
  
  /**
   * Inicjalizuje i konfiguruje wszystkie komponenty
   * Użyteczne przy inicjalizacji aplikacji
   */
  static initialize() {
    const container = this.getDependencyContainer();
    
    // Zarejestruj wszystkie repozytoria
    container.registerSingleton('userRepository', () => this.getUserRepository());
    container.registerSingleton('groupRepository', () => this.getGroupRepository());
    container.registerSingleton('subscriptionRepository', () => this.getSubscriptionRepository());
    container.registerSingleton('purchaseRepository', () => this.getPurchaseRepository());
    container.registerSingleton('transactionRepository', () => this.getTransactionRepository());
    container.registerSingleton('platformRepository', () => this.getPlatformRepository());
    container.registerSingleton('accessInstructionRepository', () => this.getAccessInstructionRepository());
    container.registerSingleton('accessTokenRepository', () => this.getAccessTokenRepository());
    container.registerSingleton('securityLogRepository', () => this.getSecurityLogRepository());
    container.registerSingleton('disputeRepository', () => this.getDisputeRepository());
    
    // Zarejestruj wszystkie usługi
    container.registerSingleton('encryptionService', () => this.getEncryptionService());
    container.registerSingleton('keyManagementService', () => this.getKeyManagementService());
    container.registerSingleton('tokenService', () => this.getTokenService());
    container.registerSingleton('notificationService', () => this.getNotificationService());
    container.registerSingleton('emailService', () => this.getEmailService());
    container.registerSingleton('paymentService', () => this.getPaymentService());
    container.registerSingleton('cacheManager', () => this.getCacheManager());
    
    // Utwórz factory dla UnitOfWork
    container.registerFactory('unitOfWork', () => this.createUnitOfWork());
    
    console.log('Infrastructure layer initialized');
  }
}

export default InfrastructureFactory;