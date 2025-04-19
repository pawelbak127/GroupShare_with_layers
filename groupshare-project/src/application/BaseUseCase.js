// src/application/BaseUseCase.js

const IUseCase = require('./interfaces/IUseCase');
const ValidationException = require('./exceptions/ValidationException');

/**
 * Bazowa implementacja przypadku użycia
 * @abstract
 * @template TRequest Typ żądania
 * @template TResponse Typ odpowiedzi
 * @implements {IUseCase<TRequest, TResponse>}
 */
class BaseUseCase {
  /**
   * Wykonuje przypadek użycia
   * @param {TRequest} request Żądanie
   * @returns {Promise<TResponse>} Odpowiedź
   * @throws {ApplicationException} W przypadku błędu
   */
  async execute(request) {
    // Walidacja żądania
    const validationErrors = this.validate(request);
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      throw new ValidationException('Validation failed', validationErrors);
    }

    // Sprawdzenie autoryzacji
    await this.authorize(request);
    
    // Sprawdź czy potrzebna transakcja
    if (this.requiresTransaction && this.unitOfWorkFactory) {
      return this.executeWithTransaction(request);
    }

    // Wykonanie właściwej logiki bez transakcji
    return this.executeImpl(request);
  }
  
  /**
   * Wykonuje przypadek użycia w ramach transakcji
   * @param {TRequest} request Żądanie
   * @returns {Promise<TResponse>} Odpowiedź
   * @private
   */
  async executeWithTransaction(request) {
    const unitOfWork = this.unitOfWorkFactory.create();
    try {
      await unitOfWork.begin();
      
      // Wykonaj właściwą logikę w kontekście transakcji
      const result = await this.executeImpl(request, unitOfWork);
      
      // Jeśli wykonanie przebiegło pomyślnie, zatwierdź transakcję
      await unitOfWork.commit();
      
      return result;
    } catch (error) {
      // W przypadku błędu wycofaj transakcję
      try {
        await unitOfWork.rollback();
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
      
      throw error;
    }
  }

  /**
   * Waliduje żądanie
   * @param {TRequest} request Żądanie
   * @returns {Object|null} Błędy walidacji lub null
   */
  validate(request) {
    return null;
  }

  /**
   * Sprawdza uprawnienia
   * @param {TRequest} request Żądanie
   * @returns {Promise<void>}
   * @throws {AuthorizationException} Gdy brak uprawnień
   */
  async authorize(request) {
    // Domyślnie bez autoryzacji
  }

  /**
   * Implementacja właściwej logiki przypadku użycia
   * @abstract
   * @param {TRequest} request Żądanie
   * @param {UnitOfWork} [unitOfWork] Optional Unit of Work
   * @returns {Promise<TResponse>} Odpowiedź
   */
  async executeImpl(request, unitOfWork) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Określa czy przypadek użycia wymaga transakcji
   * @returns {boolean} True jeśli przypadek wymaga transakcji
   */
  get requiresTransaction() {
    return false;
  }
}

module.exports = BaseUseCase;