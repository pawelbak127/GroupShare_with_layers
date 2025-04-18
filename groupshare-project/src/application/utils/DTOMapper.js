// /src/application/utils/DTOMapper.js

/**
 * Klasa pomocnicza do mapowania obiektów domeny na DTO i odwrotnie
 */
class DTOMapper {
    /**
     * Mapuje obiekt domeny na DTO
     * @template TEntity Typ encji
     * @template TDTO Typ DTO
     * @param {TEntity} entity Encja
     * @param {new() => TDTO} DTOClass Klasa DTO
     * @param {Object.<string, function(TEntity): any>} mappings Funkcje mapujące pola
     * @returns {TDTO} Zmapowane DTO
     */
    static toDTO(entity, DTOClass, mappings) {
      if (!entity) return null;
      
      const dto = new DTOClass();
      
      for (const [dtoKey, entityMapper] of Object.entries(mappings)) {
        dto[dtoKey] = entityMapper(entity);
      }
      
      return dto;
    }
    
    /**
     * Mapuje tablicę obiektów domeny na tablicę DTO
     * @template TEntity Typ encji
     * @template TDTO Typ DTO
     * @param {TEntity[]} entities Encje
     * @param {new() => TDTO} DTOClass Klasa DTO
     * @param {Object.<string, function(TEntity): any>} mappings Funkcje mapujące pola
     * @returns {TDTO[]} Zmapowane DTO
     */
    static toDTOArray(entities, DTOClass, mappings) {
      if (!entities) return [];
      
      return entities.map(entity => this.toDTO(entity, DTOClass, mappings));
    }
    
    /**
     * Mapuje DTO na obiekt do aktualizacji encji
     * @template TDTO Typ DTO
     * @param {TDTO} dto DTO
     * @param {string[]} allowedFields Dozwolone pola
     * @returns {Object} Dane do aktualizacji
     */
    static toUpdateObject(dto, allowedFields) {
      const updateObject = {};
      
      for (const field of allowedFields) {
        if (dto[field] !== undefined) {
          updateObject[field] = dto[field];
        }
      }
      
      return updateObject;
    }
    
    /**
     * Mapuje wartości enum na stringi
     * @param {Object} enumObj Obiekt enum
     * @returns {Object.<string, string>} Obiekt ze stringami
     */
    static enumToStringMapping(enumObj) {
      const result = {};
      
      for (const key of Object.keys(enumObj)) {
        if (typeof enumObj[key] !== 'function') {
          result[key] = enumObj[key].toString();
        }
      }
      
      return result;
    }
  }
  
  module.exports = DTOMapper;