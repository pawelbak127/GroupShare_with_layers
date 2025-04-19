
/**
 * Configuration provider that loads from JSON/YAML files
 */
class FileConfigProvider {
    /**
     * @param {string} filePath - Path to configuration file
     * @param {string} fileType - File type ('json' or 'yaml')
     */
    constructor(filePath, fileType = 'json') {
      this.filePath = filePath;
      this.fileType = fileType.toLowerCase();
    }
  
    /**
     * Load configuration from file
     * @returns {Promise<Object>} Configuration object
     */
    async loadConfig() {
      try {
        if (this.fileType === 'json') {
          const fileContent = await fs.readFile(this.filePath, 'utf8');
          return JSON.parse(fileContent);
        } else if (this.fileType === 'yaml') {
          // In real implementation, you'd use a YAML parser here
          throw new Error('YAML parsing not implemented');
        } else {
          throw new Error(`Unsupported file type: ${this.fileType}`);
        }
      } catch (error) {
        throw new Error(`Failed to load config from ${this.filePath}: ${error.message}`);
      }
    }
  }
  
  // Export configuration module
  module.exports = {
    ConfigurationManager,
    EnvironmentConfigProvider,
    FileConfigProvider
  };