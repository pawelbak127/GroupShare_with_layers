// /src/application/utils/Validator.js

/**
 * Klasa pomocnicza do walidacji danych
 */
class Validator {
    /**
     * Waliduje obiekt DTO
     * @param {Object} schema Schemat walidacji
     * @param {Object} data Dane do walidacji
     * @returns {Object} Wynik walidacji { isValid: boolean, errors: Object }
     */
    static validate(schema, data) {
      const errors = {};
      
      // Dla każdego pola w schemacie
      for (const [field, rules] of Object.entries(schema)) {
        // Sprawdź czy pole jest wymagane
        if (rules.required && (data[field] === undefined || data[field] === null || data[field] === '')) {
          errors[field] = `${field} is required`;
          continue;
        }
        
        // Jeśli pole jest undefined lub null, a nie jest wymagane, pomijamy dalszą walidację
        if (data[field] === undefined || data[field] === null) {
          continue;
        }
        
        // Sprawdź typ
        if (rules.type) {
          if (rules.type === 'string' && typeof data[field] !== 'string') {
            errors[field] = `${field} must be a string`;
            continue;
          } else if (rules.type === 'number' && typeof data[field] !== 'number') {
            errors[field] = `${field} must be a number`;
            continue;
          } else if (rules.type === 'boolean' && typeof data[field] !== 'boolean') {
            errors[field] = `${field} must be a boolean`;
            continue;
          } else if (rules.type === 'object' && (typeof data[field] !== 'object' || Array.isArray(data[field]))) {
            errors[field] = `${field} must be an object`;
            continue;
          } else if (rules.type === 'array' && !Array.isArray(data[field])) {
            errors[field] = `${field} must be an array`;
            continue;
          }
        }
        
        // Sprawdź minimalne wartości
        if (rules.min !== undefined) {
          if (typeof data[field] === 'number' && data[field] < rules.min) {
            errors[field] = `${field} must be at least ${rules.min}`;
            continue;
          }
        }
        
        // Sprawdź maksymalne wartości
        if (rules.max !== undefined) {
          if (typeof data[field] === 'number' && data[field] > rules.max) {
            errors[field] = `${field} must be at most ${rules.max}`;
            continue;
          }
        }
        
        // Sprawdź minimalną długość
        if (rules.minLength !== undefined) {
          if (typeof data[field] === 'string' && data[field].length < rules.minLength) {
            errors[field] = `${field} must be at least ${rules.minLength} characters long`;
            continue;
          } else if (Array.isArray(data[field]) && data[field].length < rules.minLength) {
            errors[field] = `${field} must have at least ${rules.minLength} items`;
            continue;
          }
        }
        
        // Sprawdź maksymalną długość
        if (rules.maxLength !== undefined) {
          if (typeof data[field] === 'string' && data[field].length > rules.maxLength) {
            errors[field] = `${field} must be at most ${rules.maxLength} characters long`;
            continue;
          } else if (Array.isArray(data[field]) && data[field].length > rules.maxLength) {
            errors[field] = `${field} must have at most ${rules.maxLength} items`;
            continue;
          }
        }
        
        // Sprawdź wzorzec
        if (rules.pattern && typeof data[field] === 'string') {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(data[field])) {
            errors[field] = rules.patternMessage || `${field} has invalid format`;
            continue;
          }
        }
        
        // Sprawdź dozwolone wartości
        if (rules.enum && !rules.enum.includes(data[field])) {
          errors[field] = `${field} must be one of: ${rules.enum.join(', ')}`;
          continue;
        }
        
        // Sprawdź niestandardową funkcję walidacji
        if (rules.validator && typeof rules.validator === 'function') {
          const validationError = rules.validator(data[field], data);
          if (validationError) {
            errors[field] = validationError;
            continue;
          }
        }
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    }
    
    /**
     * Waliduje adres email
     * @param {string} email Adres email
     * @returns {boolean} Czy email jest poprawny
     */
    static isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof email === 'string' && emailRegex.test(email);
    }
    
    /**
     * Waliduje UUID
     * @param {string} uuid UUID
     * @returns {boolean} Czy UUID jest poprawny
     */
    static isValidUUID(uuid) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return typeof uuid === 'string' && uuidRegex.test(uuid);
    }
    
    /**
     * Waliduje numer telefonu
     * @param {string} phone Numer telefonu
     * @returns {boolean} Czy numer telefonu jest poprawny
     */
    static isValidPhone(phone) {
      const phoneRegex = /^\+?[0-9]{8,15}$/;
      return typeof phone === 'string' && phoneRegex.test(phone);
    }
  }
  
  module.exports = Validator;