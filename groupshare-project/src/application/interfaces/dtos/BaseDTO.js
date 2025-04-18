/**
 * Bazowa klasa dla Data Transfer Objects
 */
class BaseDTO {
  /**
   * Konwertuje DTO na zwykły obiekt JS
   * @returns {Object} Obiekt JS
   */
  toJSON() {
    const json = {};
    for (const key in this) {
      if (this.hasOwnProperty(key) && !key.startsWith('_')) {
        json[key] = this[key];
      }
    }
    return json;
  }

  /**
   * Tworzy DTO z obiektu JS
   * @param {Object} data Dane wejściowe
   * @returns {BaseDTO} Nowy obiekt DTO
   */
  static fromJSON(data) {
    const dto = new this();
    
    if (!data) return dto;
    
    for (const key in dto) {
      if (dto.hasOwnProperty(key) && !key.startsWith('_') && data[key] !== undefined) {
        dto[key] = data[key];
      }
    }
    
    return dto;
  }
}

module.exports = BaseDTO;