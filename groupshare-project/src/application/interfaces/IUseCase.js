/**
 * Interfejs bazowy dla wszystkich przypadków użycia
 * @template TRequest Typ żądania
 * @template TResponse Typ odpowiedzi
 */
class IUseCase {
    /**
     * Wykonuje przypadek użycia
     * @param {TRequest} request Żądanie
     * @returns {Promise<TResponse>} Odpowiedź
     * @throws {ApplicationException} W przypadku błędu
     */
    async execute(request) {
      throw new Error('Method not implemented');
    }
  }
  
  module.exports = IUseCase;