// src/infrastructure/configuration/ConfigurationManager.js

/**
 * Service for managing application configuration
 * Provides a unified interface for accessing configuration values
 * from different sources (env variables, config files, etc.)
 */
class ConfigurationManager {
    constructor(configProviders = []) {
      this.providers = configProviders;
      this.cachedConfig = {};
      this.initialized = false;
    }
  
    /**
     * Initialize the configuration manager
     * Loads all configurations from providers
     */
    async initialize() {
      if (this.initialized) return;
  
      // Load configurations from all providers
      for (const provider of this.providers) {
        try {
          const config = await provider.loadConfig();
          this.cachedConfig = { ...this.cachedConfig, ...config };
        } catch (error) {
          console.error(`Error loading config from provider ${provider.constructor.name}:`, error);
        }
      }
  
      this.initialized = true;
    }
  
    /**
     * Get a configuration value
     * @param {string} key - Configuration key
     * @param {any} defaultValue - Default value if key is not found
     * @returns {any} Configuration value
     */
    get(key, defaultValue = null) {
      if (!this.initialized) {
        throw new Error('ConfigurationManager not initialized. Call initialize() first.');
      }
  
      return key in this.cachedConfig ? this.cachedConfig[key] : defaultValue;
    }
  
    /**
     * Check if a configuration key exists
     * @param {string} key - Configuration key
     * @returns {boolean} True if key exists
     */
    has(key) {
      if (!this.initialized) {
        throw new Error('ConfigurationManager not initialized. Call initialize() first.');
      }
  
      return key in this.cachedConfig;
    }
  
    /**
     * Get a section of configuration
     * @param {string} prefix - Section prefix
     * @returns {Object} Section configuration
     */
    getSection(prefix) {
      if (!this.initialized) {
        throw new Error('ConfigurationManager not initialized. Call initialize() first.');
      }
  
      const section = {};
      for (const [key, value] of Object.entries(this.cachedConfig)) {
        if (key.startsWith(prefix)) {
          const subKey = key.substring(prefix.length);
          section[subKey] = value;
        }
      }
  
      return section;
    }
  }