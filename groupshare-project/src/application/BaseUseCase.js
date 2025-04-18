const IUseCase = require('../interfaces/IUseCase');
const ValidationException = require('../exceptions/ValidationException');

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

    // Wykonanie właściwej logiki
    return this.executeImpl(request);
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
   * @returns {Promise<TResponse>} Odpowiedź
   */
  async executeImpl(request) {
    throw new Error('Method not implemented');
  }
}

module.exports = BaseUseCase;