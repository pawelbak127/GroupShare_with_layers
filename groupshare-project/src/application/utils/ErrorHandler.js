// /src/application/utils/ErrorHandler.js

const { 
    ApplicationException,
    ValidationException,
    AuthorizationException,
    ResourceNotFoundException,
    BusinessRuleViolationException,
    PaymentException,
    AccessDeniedException,
    TokenException,
    EncryptionException,
    ServiceUnavailableException
  } = require('../exceptions');
  
  /**
   * Klasa pomocnicza do obsługi błędów aplikacji
   */
  class ErrorHandler {
    /**
     * Mapowanie kodów błędów na kody HTTP
     * @private
     */
    static HTTP_STATUS_CODES = {
      'VALIDATION_ERROR': 400,
      'AUTHORIZATION_ERROR': 403,
      'RESOURCE_NOT_FOUND': 404,
      'BUSINESS_RULE_VIOLATION': 400,
      'PAYMENT_ERROR': 400,
      'ACCESS_DENIED': 403,
      'TOKEN_ERROR': 401,
      'ENCRYPTION_ERROR': 500,
      'SERVICE_UNAVAILABLE': 503
    };
    
    /**
     * Konwertuje błąd aplikacji na odpowiedź HTTP
     * @param {Error} error Błąd
     * @returns {Object} Odpowiedź HTTP
     */
    static handleError(error) {
      console.error('Application error:', error);
      
      // Obsługa błędów aplikacyjnych
      if (error instanceof ApplicationException) {
        // Specjalna obsługa błędów walidacji
        if (error instanceof ValidationException) {
          return {
            error: error.message,
            details: error.errors,
            code: error.code,
            status: 400
          };
        }
        
        // Mapowanie kodu błędu na kod HTTP
        const statusCode = this.HTTP_STATUS_CODES[error.code] || 500;
        
        return {
          error: error.message,
          code: error.code,
          status: statusCode
        };
      }
      
      // Obsługa ogólnych błędów
      return {
        error: 'An unexpected error occurred',
        details: error.message,
        status: 500
      };
    }
    
    /**
     * Loguje błąd
     * @param {Error} error Błąd
     * @param {string} context Kontekst błędu
     */
    static logError(error, context = '') {
      const timestamp = new Date().toISOString();
      const errorType = error.constructor.name;
      const errorMessage = error.message;
      const errorStack = error.stack;
      
      console.error(`[${timestamp}] [${context}] ${errorType}: ${errorMessage}`);
      console.error(errorStack);
      
      // W rzeczywistej implementacji tutaj mogłoby być zapisywanie do pliku, wysyłanie do serwisu monitorującego itp.
    }
    
    /**
     * Wrapper dla funkcji obsługi zapytań API
     * @param {Function} handler Funkcja obsługi
     * @returns {Function} Funkcja z obsługą błędów
     */
    static withErrorHandling(handler) {
      return async (...args) => {
        try {
          return await handler(...args);
        } catch (error) {
          return this.handleError(error);
        }
      };
    }
  }
  
  module.exports = ErrorHandler;