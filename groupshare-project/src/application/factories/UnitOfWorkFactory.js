// src/application/factories/UnitOfWorkFactory.js

const SupabaseUnitOfWork = require('../../infrastructure/persistence/supabase/SupabaseUnitOfWork');

/**
 * Fabryka Unit of Work
 */
class UnitOfWorkFactory {
  /**
   * @param {Object} supabaseClient - Klient Supabase
   * @param {Object} repositories - Obiekty repozytoriów
   */
  constructor(supabaseClient, repositories) {
    this.supabaseClient = supabaseClient;
    this.repositories = repositories;
  }
  
  /**
   * Tworzy nowy Unit of Work
   * @returns {UnitOfWork} Nowy Unit of Work
   */
  create() {
    return new SupabaseUnitOfWork(this.supabaseClient, this.repositories);
  }
}

module.exports = UnitOfWorkFactory;