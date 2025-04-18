// src/application/utils/CacheManager.js (kontynuacja)

/**
 * Menadżer cache dla warstwy aplikacji
 */
class CacheManager {
    constructor() {
      this.cache = new Map();
      this.timeouts = new Map();
    }
    
    /**
     * Pobiera wartość z cache
     * @param {string} key Klucz
     * @returns {*} Wartość lub null
     */
    get(key) {
      if (!this.cache.has(key)) return null;
      
      const { value, expiry } = this.cache.get(key);
      
      // Sprawdź czy wartość nie wygasła
      if (expiry && expiry < Date.now()) {
        this.remove(key);
        return null;
      }
      
      return value;
    }
    
    /**
     * Zapisuje wartość w cache
     * @param {string} key Klucz
     * @param {*} value Wartość
     * @param {number} ttlSeconds Czas życia w sekundach
     */
    set(key, value, ttlSeconds = 600) {
      // Usuń istniejący timeout
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
      }
      
      const expiry = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null;
      
      // Zapisz wartość
      this.cache.set(key, { value, expiry });
      
      // Ustaw timeout do usunięcia
      if (ttlSeconds > 0) {
        const timeout = setTimeout(() => {
          this.remove(key);
        }, ttlSeconds * 1000);
        
        this.timeouts.set(key, timeout);
      }
    }
    
    /**
     * Usuwa wartość z cache
     * @param {string} key Klucz
     */
    remove(key) {
      this.cache.delete(key);
      
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
        this.timeouts.delete(key);
      }
    }
    
    /**
     * Czyści cały cache
     */
    clear() {
      // Wyczyść wszystkie timeouty
      for (const timeout of this.timeouts.values()) {
        clearTimeout(timeout);
      }
      
      this.cache.clear();
      this.timeouts.clear();
    }
    
    /**
     * Zwraca wartość z cache lub wykonuje funkcję i zapisuje wynik
     * @param {string} key Klucz
     * @param {Function} fn Funkcja do wykonania
     * @param {number} ttlSeconds Czas życia w sekundach
     * @returns {Promise<*>} Wynik funkcji
     */
    async getOrSet(key, fn, ttlSeconds = 600) {
      const cachedValue = this.get(key);
      
      if (cachedValue !== null) {
        return cachedValue;
      }
      
      const value = await fn();
      this.set(key, value, ttlSeconds);
      
      return value;
    }
    
    /**
     * Invaliduje cache dla klucza lub wzorca klucza
     * @param {string|RegExp} pattern Klucz lub wzorzec klucza
     */
    invalidate(pattern) {
      if (pattern instanceof RegExp) {
        // Invaliduj wszystkie klucze pasujące do wzorca
        for (const key of this.cache.keys()) {
          if (pattern.test(key)) {
            this.remove(key);
          }
        }
      } else {
        // Invaliduj konkretny klucz
        this.remove(pattern);
      }
    }
  }
  
  // Eksportuj singleton
  export const cacheManager = new CacheManager();