// src/application/ports/persistence/RepositoryPort.js

/**
 * Interfejs portu dla repozytoriów
 * @template T Typ encji
 */
class RepositoryPort {
    /**
     * Zapisuje encję
     * @param {T} entity Encja do zapisania
     * @returns {Promise<T>} Zapisana encja
     */
    async save(entity) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Znajduje encję po ID
     * @param {string} id ID encji
     * @returns {Promise<T|null>} Znaleziona encja lub null
     */
    async findById(id) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Usuwa encję
     * @param {string} id ID encji
     * @returns {Promise<boolean>} Czy usunięto
     */
    async delete(id) {
      throw new Error('Method not implemented');
    }
    
    /**
     * Sprawdza czy encja istnieje
     * @param {string} id ID encji
     * @returns {Promise<boolean>} Czy istnieje
     */
    async exists(id) {
      throw new Error('Method not implemented');
    }
  }
  
  export default RepositoryPort;