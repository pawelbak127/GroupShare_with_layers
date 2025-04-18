// src/infrastructure/repositories/SupabaseSubscriptionRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { Subscription } from '@/domain/subscription/Subscription';
import { Id } from '@/domain/shared/value-objects/Id';
import { Money } from '@/domain/shared/value-objects/Money';
import SubscriptionStatus from '@/domain/subscription/value-objects/SubscriptionStatus';

/**
 * Implementacja repozytorium subskrypcji używająca Supabase
 * @implements {RepositoryPort<Subscription>}
 */
class SupabaseSubscriptionRepository extends RepositoryPort {
  /**
   * Zapisuje subskrypcję
   * @param {Subscription} subscription Subskrypcja do zapisania
   * @returns {Promise<Subscription>} Zapisana subskrypcja
   */
  async save(subscription) {
    // Przygotuj dane do zapisu
    const subscriptionData = {
      id: subscription.id,
      group_id: subscription.groupId,
      platform_id: subscription.platformId,
      status: subscription.status.toString(),
      slots_total: subscription.slotsTotal,
      slots_available: subscription.slotsAvailable,
      price_per_slot: subscription.pricePerSlot.amount,
      currency: subscription.pricePerSlot.currency,
      updated_at: new Date().toISOString()
    };
    
    // Jeśli to nowa subskrypcja, dodaj datę utworzenia
    if (!await this.exists(subscription.id)) {
      subscriptionData.created_at = subscription.createdAt.toISOString();
    }
    
    // Zapisz w bazie danych
    const { data, error } = await supabaseAdmin
      .from('group_subs')
      .upsert(subscriptionData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save subscription: ${error.message}`);
    }
    
    // Jeśli są instrukcje dostępu, zapisz je
    if (subscription.hasAccessInstructions()) {
      await this.saveAccessInstructions(subscription);
    }
    
    // Zwróć zaktualizowany obiekt domeny
    return Subscription.restore(
      data.id,
      data.group_id,
      data.platform_id,
      data.status,
      data.slots_total,
      data.slots_available,
      data.price_per_slot,
      data.currency,
      new Date(data.created_at),
      new Date(data.updated_at),
      subscription.accessInstructions
    );
  }
  
  /**
   * Znajduje subskrypcję po ID
   * @param {string} id ID subskrypcji
   * @returns {Promise<Subscription|null>} Znaleziona subskrypcja lub null
   */
  async findById(id) {
    // Pobierz dane z bazy
    const { data, error } = await supabaseAdmin
      .from('group_subs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Sprawdź czy istnieją instrukcje dostępu
    const accessInstructions = await this.getAccessInstructions(id);
    
    // Utwórz obiekt domeny
    return Subscription.restore(
      data.id,
      data.group_id,
      data.platform_id,
      data.status,
      data.slots_total,
      data.slots_available,
      data.price_per_slot,
      data.currency,
      new Date(data.created_at),
      new Date(data.updated_at),
      accessInstructions
    );
  }
  
  /**
   * Usuwa subskrypcję
   * @param {string} id ID subskrypcji
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('group_subs')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * Sprawdza czy subskrypcja istnieje
   * @param {string} id ID subskrypcji
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id) {
    const { count, error } = await supabaseAdmin
      .from('group_subs')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Wyszukuje subskrypcje z filtrami
   * @param {Object} filters Filtry
   * @param {Object} pagination Parametry paginacji
   * @returns {Promise<Object>} Wyniki wyszukiwania
   */
  async findWithFilters(filters, pagination) {
    // Przygotuj zapytanie
    let query = supabaseAdmin
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups!inner(
          id, 
          name, 
          owner_id, 
          user_profiles!inner(
            id, 
            display_name, 
            avatar_url, 
            rating_avg, 
            verification_level
          )
        )
      `);
    
    // Dodaj filtry
    if (filters.platformId) {
      query = query.eq('platform_id', filters.platformId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.minPrice !== null && filters.minPrice !== undefined) {
      query = query.gte('price_per_slot', filters.minPrice);
    }
    
    if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
      query = query.lte('price_per_slot', filters.maxPrice);
    }
    
    if (filters.availableSlots) {
      query = query.gt('slots_available', 0);
    }
    
    // Dodaj paginację
    const { page, limit, offset, orderBy, ascending } = pagination;
    
    // Pobierz liczbę wyników
    const { count, error: countError } = await query.select('id', { 
      count: 'exact', 
      head: true 
    });
    
    if (countError) {
      throw new Error(`Failed to count subscriptions: ${countError.message}`);
    }
    
    // Dodaj sortowanie i paginację
    query = query
      .order(orderBy, { ascending })
      .range(offset, offset + limit - 1);
    
    // Wykonaj zapytanie
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }
    
    // Konwertuj dane na obiekty domeny
    const items = await Promise.all(data.map(async item => {
      // Sprawdź czy istnieją instrukcje dostępu
      const hasInstructions = await this.accessInstructionsExist(item.id);
      
      return Subscription.restore(
        item.id,
        item.group_id,
        item.platform_id,
        item.status,
        item.slots_total,
        item.slots_available,
        item.price_per_slot,
        item.currency,
        new Date(item.created_at),
        new Date(item.updated_at),
        null // Nie pobieramy szczegółów instrukcji
      );
    }));
    
    return {
      items,
      totalCount: count
    };
  }
  
  /**
   * Pobiera instrukcje dostępu
   * @param {string} subscriptionId ID subskrypcji
   * @returns {Promise<Object|null>} Instrukcje dostępu lub null
   */
  async getAccessInstructions(subscriptionId) {
    const { data, error } = await supabaseAdmin
      .from('access_instructions')
      .select('*')
      .eq('group_sub_id', subscriptionId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      encryptedData: data.encrypted_data,
      encryptionKeyId: data.encryption_key_id,
      iv: data.iv,
      encryptionVersion: data.encryption_version
    };
  }
  
  /**
   * Sprawdza czy instrukcje dostępu istnieją
   * @param {string} subscriptionId ID subskrypcji
   * @returns {Promise<boolean>} Czy instrukcje istnieją
   */
  async accessInstructionsExist(subscriptionId) {
    const { count, error } = await supabaseAdmin
      .from('access_instructions')
      .select('*', { count: 'exact', head: true })
      .eq('group_sub_id', subscriptionId);
    
    return !error && count > 0;
  }
  
  /**
   * Zapisuje instrukcje dostępu
   * @param {Subscription} subscription Subskrypcja
   * @returns {Promise<void>}
   */
  async saveAccessInstructions(subscription) {
    if (!subscription.accessInstructions) {
      return;
    }
    
    const instructionsData = {
      group_sub_id: subscription.id,
      encrypted_data: subscription.accessInstructions.encryptedData,
      data_key_enc: subscription.accessInstructions.dataKeyEnc || 'dummy-key',
      encryption_key_id: subscription.accessInstructions.encryptionKeyId,
      iv: subscription.accessInstructions.iv,
      encryption_version: subscription.accessInstructions.encryptionVersion,
      updated_at: new Date().toISOString()
    };
    
    // Sprawdź czy instrukcje już istnieją
    const exists = await this.accessInstructionsExist(subscription.id);
    
    if (exists) {
      // Aktualizuj istniejące
      await supabaseAdmin
        .from('access_instructions')
        .update(instructionsData)
        .eq('group_sub_id', subscription.id);
    } else {
      // Utwórz nowe
      instructionsData.created_at = new Date().toISOString();
      await supabaseAdmin
        .from('access_instructions')
        .insert(instructionsData);
    }
  }
}

export default SupabaseSubscriptionRepository;