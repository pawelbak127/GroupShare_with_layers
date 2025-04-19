// /src/infrastructure/di/DependencyContainer.js

import supabaseAdmin from '@/lib/database/supabase-admin-client';

// Importy repozytoriów
import SupabaseUserRepository from '../repositories/SupabaseUserRepository';
import SupabaseGroupRepository from '../repositories/SupabaseGroupRepository';
import SupabaseSubscriptionRepository from '../repositories/SupabaseSubscriptionRepository';
import SupabasePurchaseRepository from '../repositories/SupabasePurchaseRepository';
import SupabaseTransactionRepository from '../repositories/SupabaseTransactionRepository';
import SupabasePlatformRepository from '../repositories/SupabasePlatformRepository';
import SupabaseAccessInstructionRepository from '../repositories/SupabaseAccessInstructionRepository';
import SupabaseAccessTokenRepository from '../repositories/SupabaseAccessTokenRepository';

// Importy adapterów
import EncryptionServiceAdapter from '../security/encryption/EncryptionServiceAdapter';
import KeyManagementAdapter from '../security/key-management/KeyManagementAdapter';
import TokenServiceAdapter from '../security/token/TokenServiceAdapter';
import NotificationAdapter from '../notification/NotificationAdapter';
import { getCacheManager } from '../cache/CacheManager';
import PaymentServiceAdapter from '../external-services/payment/PaymentServiceAdapter';

// Importy z innych warstw
import { UseCaseFactory } from '@/application/factories/UseCaseFactory';
import { EventPublisher } from '@/application/services/EventPublisher';
import { ErrorHandler } from '@/application/utils/ErrorHandler';

/**
 * Kontener do wstrzykiwania zależności
 * Zapewnia globalny dostęp do wszystkich serwisów i repozytoriów
 */
class DependencyContainer {
  constructor() {
    this._instances = new Map();
    this._singletons = new Map();
    this._factories = new Map();
    
    // Inicjalizacja podstawowych usług
    this._initializeCore();
    
    // Inicjalizacja repozytoriów
    this._initializeRepositories();
    
    // Inicjalizacja adapterów
    this._initializeAdapters();
    
    // Inicjalizacja fabryk
    this._initializeFactories();
  }
  
  /**
   * Inicjalizuje podstawowe usługi
   * @private
   */
  _initializeCore() {
    // EventPublisher jako singleton
    this.registerSingleton('eventPublisher', () => new EventPublisher());
    
    // ErrorHandler jako singleton
    this.registerSingleton('errorHandler', () => new ErrorHandler());
    
    // CacheManager jako singleton
    this.registerSingleton('cacheManager', () => getCacheManager({
      useMemoryCache: true,
      defaultTtl: 300, // 5 minut
      debug: process.env.NODE_ENV !== 'production'
    }));
  }
  
  /**
   * Inicjalizuje repozytoria
   * @private
   */
  _initializeRepositories() {
    // Rejestracja repozytoriów
    this.registerSingleton('userRepository', () => new SupabaseUserRepository());
    this.registerSingleton('groupRepository', () => new SupabaseGroupRepository());
    this.registerSingleton('subscriptionRepository', () => new SupabaseSubscriptionRepository());
    this.registerSingleton('purchaseRepository', () => new SupabasePurchaseRepository());
    this.registerSingleton('transactionRepository', () => new SupabaseTransactionRepository());
    this.registerSingleton('platformRepository', () => new SupabasePlatformRepository());
    this.registerSingleton('accessInstructionRepository', () => new SupabaseAccessInstructionRepository());
    this.registerSingleton('accessTokenRepository', () => new SupabaseAccessTokenRepository());
  }
  
  /**
   * Inicjalizuje adaptery
   * @private
   */
  _initializeAdapters() {
    // Klucz główny dla usług kryptograficznych (w produkcji powinien być w bezpiecznym vault)
    const masterKey = process.env.ENCRYPTION_MASTER_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
    
    // Usługa szyfrowania
    this.registerSingleton('encryptionService', () => new EncryptionServiceAdapter(masterKey, {
      algorithm: 'aes-256-gcm'
    }));
    
    // Usługa zarządzania kluczami
    this.registerSingleton('keyManagementService', () => new KeyManagementAdapter(masterKey, {
      useHsm: process.env.USE_HSM === 'true'
    }));
    
    // Usługa tokenów
    this.registerSingleton('tokenService', () => new TokenServiceAdapter({
      tokenSalt: process.env.TOKEN_SALT || 'default-salt',
      defaultExpiryMinutes: 30
    }));
    
    // Usługa powiadomień
    this.registerSingleton('notificationService', () => new NotificationAdapter({
      useDatabase: true,
      useToast: true,
      useEmail: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true'
    }));
    
    // Usługa płatności
    this.registerSingleton('paymentService', () => new PaymentServiceAdapter({
      blikEnabled: true,
      cardEnabled: true,
      transferEnabled: true,
      testMode: process.env.NODE_ENV !== 'production',
      logTransactions: true
    }));
  }
  
  /**
   * Inicjalizuje fabryki
   * @private
   */
  _initializeFactories() {
    // Rejestracja fabryki przypadków użycia
    this.registerSingleton('useCaseFactory', () => {
      // Skonfiguruj UseCaseFactory z naszymi repozytoriami i usługami
      const factory = new UseCaseFactory();
      
      // Ustaw repozytoria
      factory.setUserRepository(this.resolve('userRepository'));
      factory.setGroupRepository(this.resolve('groupRepository'));
      factory.setSubscriptionRepository(this.resolve('subscriptionRepository'));
      factory.setPurchaseRepository(this.resolve('purchaseRepository'));
      factory.setTransactionRepository(this.resolve('transactionRepository'));
      factory.setPlatformRepository(this.resolve('platformRepository'));
      factory.setAccessInstructionRepository(this.resolve('accessInstructionRepository'));
      factory.setAccessTokenRepository(this.resolve('accessTokenRepository'));
      
      // Ustaw usługi
      factory.setEncryptionService(this.resolve('encryptionService'));
      factory.setKeyManagementService(this.resolve('keyManagementService'));
      factory.setTokenService(this.resolve('tokenService'));
      factory.setNotificationService(this.resolve('notificationService'));
      factory.setPaymentService(this.resolve('paymentService'));
      factory.setEventPublisher(this.resolve('eventPublisher'));
      
      return factory;
    });
  }
  
  /**
   * Rejestruje singleton (jedna instancja przez cały cykl życia aplikacji)
   * @param {string} name - Nazwa usługi
   * @param {Function} factory - Funkcja tworząca instancję
   */
  registerSingleton(name, factory) {
    this._singletons.set(name, factory);
  }
  
  /**
   * Rejestruje fabrykę (nowa instancja przy każdym wywołaniu)
   * @param {string} name - Nazwa usługi
   * @param {Function} factory - Funkcja tworząca instancję
   */
  registerFactory(name, factory) {
    this._factories.set(name, factory);
  }
  
  /**
   * Rejestruje instancję
   * @param {string} name - Nazwa usługi
   * @param {*} instance - Instancja
   */
  registerInstance(name, instance) {
    this._instances.set(name, instance);
  }
  
  /**
   * Rozwiązuje zależność
   * @param {string} name - Nazwa usługi
   * @returns {*} - Instancja usługi
   */
  resolve(name) {
    // Sprawdź czy instancja już istnieje
    if (this._instances.has(name)) {
      return this._instances.get(name);
    }
    
    // Sprawdź czy to singleton
    if (this._singletons.has(name)) {
      const instance = this._singletons.get(name)();
      this._instances.set(name, instance);
      return instance;
    }
    
    // Sprawdź czy to fabryka
    if (this._factories.has(name)) {
      return this._factories.get(name)();
    }
    
    throw new Error(`Dependency not registered: ${name}`);
  }
  
  /**
   * Resetuje kontener (głównie do testów)
   * @param {Array<string>} except - Lista nazw usług, które nie powinny być zresetowane
   */
  reset(except = []) {
    const preservedInstances = new Map();
    
    // Zachowaj wskazane instancje
    for (const name of except) {
      if (this._instances.has(name)) {
        preservedInstances.set(name, this._instances.get(name));
      }
    }
    
    // Resetuj wszystkie instancje
    this._instances = preservedInstances;
  }
}

// Singleton dla kontenera
let containerInstance = null;

/**
 * Pobiera instancję kontenera
 * @returns {DependencyContainer} - Instancja kontenera
 */
export const getDependencyContainer = () => {
  if (!containerInstance) {
    containerInstance = new DependencyContainer();
  }
  return containerInstance;
};

// Funkcja pomocnicza do łatwego rozwiązywania zależności
export const resolve = (name) => {
  return getDependencyContainer().resolve(name);
};

export default DependencyContainer;