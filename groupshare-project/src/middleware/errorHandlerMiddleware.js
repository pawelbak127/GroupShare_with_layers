// src/middleware/errorHandlerMiddleware.js

import { ApplicationException, ValidationException } from '@/application/exceptions';

/**
 * Mapowanie kodów błędów na kody HTTP
 */
const HTTP_STATUS_CODES = {
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
 * Middleware do obsługi błędów aplikacyjnych
 * @param {Error} error Błąd
 * @returns {Object} Obiekt odpowiedzi
 */
export function handleApplicationError(error) {
  // Logowanie błędu
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
    const statusCode = HTTP_STATUS_CODES[error.code] || 500;
    
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
 * Wrapper dla funkcji API do obsługi błędów
 * @param {Function} handler Funkcja obsługi API
 * @returns {Function} Funkcja z obsługą błędów
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      const errorResponse = handleApplicationError(error);
      return res.status(errorResponse.status).json(errorResponse);
    }
  };
}