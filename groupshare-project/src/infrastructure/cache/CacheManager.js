// /src/infrastructure/cache/CacheManager.js

/**
 * Menedżer cache'u do optymalizacji wydajności
 * Implementuje wzorzec strategii dla różnych poziomów cache'owania
 */
export class CacheManager {
    /**
     * Inicjalizuje cache manager
     * @param {Object} options - Opcje konfiguracyjne
     */
    constructor(options = {}) {
      this.options = {
        useMemoryCache: true,
        useLocalStorage: false,
        useBrowserCache: false,
        defaultTtl: 300, // 5 minut w sekundach
        debug: false,
        ...options
      };
      
      // Cache pamięciowy (dla Node.js/server)
      this.memoryCache = new Map();
      this.memoryCacheExpiry = new Map();
      
      // Ostatni dostęp do cache'u
      this.lastAccess = new Map();
      
      // Liczniki statystyk
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        invalidations: 0
      };
    }
    
    /**
     * Ustawia wartość w cache'u
     * @param {string} key - Klucz
     * @param {any} value - Wartość
     * @param {Object} options - Opcje
     * @returns {boolean} - Czy operacja się powiodła
     */
    set(key, value, options = {}) {
      try {
        const ttl = options.ttl || this.options.defaultTtl;
        const expiresAt = Date.now() + (ttl * 1000);
        
        // Serializacja wartości
        const serializedValue = JSON.stringify(value);
        
        // Memory cache (po stronie serwera)
        if (this.options.useMemoryCache) {
          this.memoryCache.set(key, serializedValue);
          this.memoryCacheExpiry.set(key, expiresAt);
          this.lastAccess.set(key, Date.now());
        }
        
        // Local Storage (po stronie klienta)
        if (this.options.useLocalStorage && typeof window !== 'undefined') {
          try {
            const item = {
              value: serializedValue,
              expiresAt
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(item));
          } catch (e) {
            if (this.options.debug) {
              console.warn('Failed to set item in localStorage:', e);
            }
          }
        }
        
        // Statystyki
        this.stats.sets++;
        
        return true;
      } catch (error) {
        if (this.options.debug) {
          console.error('Cache set error:', error);
        }
        return false;
      }
    }
    
    /**
     * Pobiera wartość z cache'u
     * @param {string} key - Klucz
     * @returns {any|null} - Wartość lub null jeśli nie znaleziono
     */
    get(key) {
      try {
        let value = null;
        let found = false;
        
        // Memory cache (po stronie serwera)
        if (this.options.useMemoryCache && this.memoryCache.has(key)) {
          const expiresAt = this.memoryCacheExpiry.get(key);
          
          // Sprawdź czy nie wygasło
          if (expiresAt > Date.now()) {
            value = this.memoryCache.get(key);
            found = true;
            
            // Aktualizuj ostatni dostęp
            this.lastAccess.set(key, Date.now());
          } else {
            // Usuń wygasłą wartość
            this.invalidate(key);
          }
        }
        
        // Local Storage (po stronie klienta)
        if (!found && this.options.useLocalStorage && typeof window !== 'undefined') {
          try {
            const item = localStorage.getItem(`cache_${key}`);
            
            if (item) {
              const parsed = JSON.parse(item);
              
              // Sprawdź czy nie wygasło
              if (parsed.expiresAt > Date.now()) {
                value = parsed.value;
                found = true;
                
                // Dodaj do memory cache jeśli włączone
                if (this.options.useMemoryCache) {
                  this.memoryCache.set(key, value);
                  this.memoryCacheExpiry.set(key, parsed.expiresAt);
                  this.lastAccess.set(key, Date.now());
                }
              } else {
                // Usuń wygasłą wartość
                localStorage.removeItem(`cache_${key}`);
              }
            }
          } catch (e) {
            if (this.options.debug) {
              console.warn('Failed to get item from localStorage:', e);
            }
          }
        }
        
        // Statystyki
        if (found) {
          this.stats.hits++;
          return JSON.parse(value);
        } else {
          this.stats.misses++;
          return null;
        }
      } catch (error) {
        if (this.options.debug) {
          console.error('Cache get error:', error);
        }
        return null;
      }
    }
    
    /**
     * Unieważnia wartość w cache'u
     * @param {string} key - Klucz
     * @returns {boolean} - Czy operacja się powiodła
     */
    invalidate(key) {
      try {
        // Memory cache (po stronie serwera)
        if (this.options.useMemoryCache) {
          this.memoryCache.delete(key);
          this.memoryCacheExpiry.delete(key);
          this.lastAccess.delete(key);
        }
        
        // Local Storage (po stronie klienta)
        if (this.options.useLocalStorage && typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`cache_${key}`);
          } catch (e) {
            if (this.options.debug) {
              console.warn('Failed to remove item from localStorage:', e);
            }
          }
        }
        
        // Statystyki
        this.stats.invalidations++;
        
        return true;
      } catch (error) {
        if (this.options.debug) {
          console.error('Cache invalidate error:', error);
        }
        return false;
      }
    }
    
    /**
     * Unieważnia wszystkie wartości w cache'u z danym prefiksem
     * @param {string} prefix - Prefiks kluczy do unieważnienia
     * @returns {number} - Liczba unieważnionych kluczy
     */
    invalidateByPrefix(prefix) {
      try {
        let count = 0;
        
        // Memory cache (po stronie serwera)
        if (this.options.useMemoryCache) {
          for (const key of this.memoryCache.keys()) {
            if (key.startsWith(prefix)) {
              this.invalidate(key);
              count++;
            }
          }
        }
        
        // Local Storage (po stronie klienta)
        if (this.options.useLocalStorage && typeof window !== 'undefined') {
          try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key.startsWith(`cache_${prefix}`)) {
                keysToRemove.push(key);
              }
            }
            
            // Usuwamy w osobnej pętli, aby nie wpływać na iterację
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
              count++;
            });
          } catch (e) {
            if (this.options.debug) {
              console.warn('Failed to invalidate prefix in localStorage:', e);
            }
          }
        }
        
        return count;
      } catch (error) {
        if (this.options.debug) {
          console.error('Cache invalidateByPrefix error:', error);
        }
        return 0;
      }
    }
    
    /**
     * Sprawdza czy klucz istnieje w cache'u
     * @param {string} key - Klucz
     * @returns {boolean} - Czy klucz istnieje
     */
    has(key) {
      // Memory cache (po stronie serwera)
      if (this.options.useMemoryCache && this.memoryCache.has(key)) {
        const expiresAt = this.memoryCacheExpiry.get(key);
        
        // Sprawdź czy nie wygasło
        if (expiresAt > Date.now()) {
          return true;
        } else {
          // Usuń wygasłą wartość
          this.invalidate(key);
          return false;
        }
      }
      
      // Local Storage (po stronie klienta)
      if (this.options.useLocalStorage && typeof window !== 'undefined') {
        try {
          const item = localStorage.getItem(`cache_${key}`);
          
          if (item) {
            const parsed = JSON.parse(item);
            
            // Sprawdź czy nie wygasło
            if (parsed.expiresAt > Date.now()) {
              return true;
            } else {
              // Usuń wygasłą wartość
              localStorage.removeItem(`cache_${key}`);
              return false;
            }
          }
        } catch (e) {
          // Ignoruj błędy localStorage
        }
      }
      
      return false;
    }
    
    /**
     * Funkcja pomocnicza do zapisywania w cache'u z deduplikacją
     * @param {string} key - Klucz cache'u
     * @param {Function} fetchFunc - Funkcja pobierająca dane
     * @param {Object} options - Opcje cache'u
     * @returns {Promise<any>} - Dane z cache'u lub z funkcji fetch
     */
    async getOrSet(key, fetchFunc, options = {}) {
      // Sprawdź czy dane są w cache'u
      const cachedValue = this.get(key);
      
      if (cachedValue !== null) {
        return cachedValue;
      }
      
      // Jeśli nie ma w cache'u, pobierz dane
      const fetchedValue = await fetchFunc();
      
      // Zapisz dane do cache'u
      this.set(key, fetchedValue, options);
      
      return fetchedValue;
    }
    
    /**
     * Czyści stare wpisy z cache'u pamięciowego
     * @param {number} maxAge - Maksymalny wiek w milisekundach
     * @returns {number} - Liczba wyczyszczonych wpisów
     */
    cleanup(maxAge = 3600000) { // domyślnie 1 godzina
      let count = 0;
      const now = Date.now();
      
      // Memory cache (po stronie serwera)
      if (this.options.useMemoryCache) {
        for (const [key, lastAccessTime] of this.lastAccess.entries()) {
          if (now - lastAccessTime > maxAge) {
            this.invalidate(key);
            count++;
          }
        }
      }
      
      return count;
    }
    
    /**
     * Resetuje wszystkie wartości w cache'u
     */
    clear() {
      // Memory cache (po stronie serwera)
      if (this.options.useMemoryCache) {
        this.memoryCache.clear();
        this.memoryCacheExpiry.clear();
        this.lastAccess.clear();
      }
      
      // Local Storage (po stronie klienta)
      if (this.options.useLocalStorage && typeof window !== 'undefined') {
        try {
          // Usuwamy tylko klucze z prefiksem cache_
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cache_')) {
              keysToRemove.push(key);
            }
          }
          
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
          });
        } catch (e) {
          if (this.options.debug) {
            console.warn('Failed to clear localStorage cache:', e);
          }
        }
      }
      
      // Resetuj statystyki
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        invalidations: 0
      };
    }
    
    /**
     * Pobiera statystyki cache'u
     * @returns {Object} - Statystyki
     */
    getStats() {
      return {
        ...this.stats,
        memoryEntries: this.options.useMemoryCache ? this.memoryCache.size : 0,
        hitRatio: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
      };
    }
  }
  
  // Singleton dla globalnego dostępu do cache'u
  let cacheManagerInstance = null;
  
  /**
   * Pobiera instancję cache managera (Singleton)
   * @param {Object} options - Opcje konfiguracyjne
   * @returns {CacheManager} - Instancja cache managera
   */
  export const getCacheManager = (options = {}) => {
    if (!cacheManagerInstance) {
      cacheManagerInstance = new CacheManager(options);
    }
    return cacheManagerInstance;
  };
  
  export default CacheManager;