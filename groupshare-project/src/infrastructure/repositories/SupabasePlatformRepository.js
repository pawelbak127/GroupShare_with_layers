// /src/infrastructure/repositories/SupabasePlatformRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { SubscriptionPlatform } from '@/domain/subscription/entities/SubscriptionPlatform';
import { Id } from '@/domain/shared/value-objects/Id';

/**
 * Implementacja repozytorium platform subskrypcyjnych używająca Supabase
 * @implements {RepositoryPort<SubscriptionPlatform>}
 */
class SupabasePlatformRepository extends RepositoryPort {
  /**
   * Zapisuje platformę
   * @param {SubscriptionPlatform} platform Platforma do zapisania
   * @returns {Promise<SubscriptionPlatform>} Zapisana platforma
   */
  async save(platform) {
    // Przygotuj dane do zapisu
    const platformData = {
      id: platform.id,
      name: platform.name,
      icon: platform.icon,
      active: platform.isActive,
      updated_at: new Date().toISOString()
    };
    
    // Jeśli to nowa platforma, dodaj datę utworzenia
    if (!await this.exists(platform.id)) {
      platformData.created_at = new Date().toISOString();
    }
    
    // Zapisz w bazie danych
    const { data, error } = await supabaseAdmin
      .from('subscription_platforms')
      .upsert(platformData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save platform: ${error.message}`);
    }
    
    // Zwróć zaktualizowany obiekt domeny
    return SubscriptionPlatform.restore(
      data.id,
      data.name,
      data.icon,
      data.active
    );
  }
  
  /**
   * Znajduje platformę po ID
   * @param {string} id ID platformy
   * @returns {Promise<SubscriptionPlatform|null>} Znaleziona platforma lub null
   */
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('subscription_platforms')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return SubscriptionPlatform.restore(
      data.id,
      data.name,
      data.icon,
      data.active
    );
  }
  
  /**
   * Usuwa platformę
   * @param {string} id ID platformy
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('subscription_platforms')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * Sprawdza czy platforma istnieje
   * @param {string} id ID platformy
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id) {
    const { count, error } = await supabaseAdmin
      .from('subscription_platforms')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Pobiera wszystkie aktywne platformy
   * @returns {Promise<SubscriptionPlatform[]>} Lista platform
   */
  async findAllActive() {
    const { data, error } = await supabaseAdmin
      .from('subscription_platforms')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) {
      throw new Error(`Failed to fetch active platforms: ${error.message}`);
    }
    
    return data.map(platform => SubscriptionPlatform.restore(
      platform.id,
      platform.name,
      platform.icon,
      platform.active
    ));
  }
  
  /**
   * Pobiera wszystkie platformy
   * @returns {Promise<SubscriptionPlatform[]>} Lista platform
   */
  async findAll() {
    const { data, error } = await supabaseAdmin
      .from('subscription_platforms')
      .select('*')
      .order('name');
    
    if (error) {
      throw new Error(`Failed to fetch platforms: ${error.message}`);
    }
    
    return data.map(platform => SubscriptionPlatform.restore(
      platform.id,
      platform.name,
      platform.icon,
      platform.active
    ));
  }
}

export default SupabasePlatformRepository;