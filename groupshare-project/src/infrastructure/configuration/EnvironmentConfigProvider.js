
/**
 * Configuration provider that loads from environment variables
 */
class EnvironmentConfigProvider {
    /**
     * @param {Object} options - Provider options
     * @param {string[]} options.requiredVars - List of required env variables
     * @param {Object} options.mapping - Mapping of env variable names to config keys
     */
    constructor(options = {}) {
      this.requiredVars = options.requiredVars || [];
      this.mapping = options.mapping || {};
    }
  
    /**
     * Load configuration from environment variables
     * @returns {Promise<Object>} Configuration object
     */
    async loadConfig() {
      const config = {};
  
      // Check required variables
      for (const varName of this.requiredVars) {
        if (!(varName in process.env)) {
          throw new Error(`Required environment variable ${varName} is missing`);
        }
      }
  
      // Apply mapping if specified
      if (Object.keys(this.mapping).length > 0) {
        for (const [envVar, configKey] of Object.entries(this.mapping)) {
          if (envVar in process.env) {
            config[configKey] = process.env[envVar];
          }
        }
      } else {
        // Load all environment variables
        for (const [key, value] of Object.entries(process.env)) {
          config[key] = value;
        }
      }
  
      return config;
    }
  }