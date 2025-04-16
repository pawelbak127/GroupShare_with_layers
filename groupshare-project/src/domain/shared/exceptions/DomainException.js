// src/domain/shared/exceptions/DomainException.js

/**
 * Base class for all domain exceptions
 * @extends Error
 */
class DomainException extends Error {
    /**
     * @param {string} message - Error message
     */
    constructor(message) {
      super(message);
      this.name = this.constructor.name;
    }
  }
  
  /**
   * Exception for validation errors
   * @extends DomainException
   */
  class ValidationException extends DomainException {
    /**
     * @param {string} message - Error message
     * @param {Object} errors - Validation errors
     */
    constructor(message, errors = {}) {
      super(message);
      this.errors = errors;
    }
  }
  
  /**
   * Exception for business rule violations
   * @extends DomainException
   */
  class BusinessRuleViolationException extends DomainException {
    /**
     * @param {string} message - Error message
     * @param {string} rule - The business rule that was violated
     */
    constructor(message, rule) {
      super(message);
      this.rule = rule;
    }
  }
  
  /**
   * Exception for unauthorized operations
   * @extends DomainException
   */
  class UnauthorizedAccessException extends DomainException {
    /**
     * @param {string} message - Error message
     * @param {string} resource - The resource that was attempted to be accessed
     */
    constructor(message, resource) {
      super(message);
      this.resource = resource;
    }
  }
  
  /**
   * Exception for resource not found errors
   * @extends DomainException
   */
  class ResourceNotFoundException extends DomainException {
    /**
     * @param {string} message - Error message
     * @param {string} resourceType - The type of resource
     * @param {string} resourceId - The ID of the resource
     */
    constructor(message, resourceType, resourceId) {
      super(message);
      this.resourceType = resourceType;
      this.resourceId = resourceId;
    }
  }
  
  /**
   * Exception for concurrency conflicts
   * @extends DomainException
   */
  class ConcurrencyException extends DomainException {
    /**
     * @param {string} message - Error message
     * @param {string} resourceType - The type of resource
     * @param {string} resourceId - The ID of the resource
     */
    constructor(message, resourceType, resourceId) {
      super(message);
      this.resourceType = resourceType;
      this.resourceId = resourceId;
    }
  }
  
  // Export all exceptions
  module.exports = {
    DomainException,
    ValidationException,
    BusinessRuleViolationException,
    UnauthorizedAccessException,
    ResourceNotFoundException,
    ConcurrencyException
  };