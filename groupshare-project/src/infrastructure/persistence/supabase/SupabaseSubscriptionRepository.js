// src/infrastructure/persistence/supabase/SupabaseSubscriptionRepository.js

const SubscriptionRepository = require('../../../domain/subscription/SubscriptionRepository');
const Subscription = require('../../../domain/subscription/Subscription');
const { Id } = require('../../../domain/shared/value-objects/Id');
const SubscriptionStatus = require('../../../domain/subscription/value-objects/SubscriptionStatus');
const Money = require('../../../domain/shared/value-objects/Money');
const AccessInstructions = require('../../../domain/subscription/value-objects/AccessInstructions');

/**
 * Implementacja repozytorium subskrypcji dla Supabase
 * @extends SubscriptionRepository
 */
class SupabaseSubscriptionRepository extends SubscriptionRepository {
  /**
   * @param {Object} supabaseClient - Klient Supabase
   */
  constructor(supabaseClient) {
    super();
    this.supabaseClient = supabaseClient;
  }
  
  /**
   * Zapisuje subskrypcję w bazie danych
   * @param {Subscription} subscription - Subskrypcja do zapisania
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Subscription>} Zapisana subskrypcja
   */
  async save(subscription, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    const data = {
      id: subscription.id,
      group_id: subscription.groupId,
      platform_id: subscription.platformId,
      status: subscription.status.toString(),
      slots_total: subscription.slotsTotal,
      slots_available: subscription.slotsAvailable,
      price_per_slot: subscription.pricePerSlot.amount,
      currency: subscription.pricePerSlot.currency,
      created_at: subscription.createdAt.toISOString(),
      updated_at: subscription.updatedAt.toISOString()
    };
    
    try {
      if (await this.exists(subscription.id, client)) {
        // Aktualizuj istniejący rekord
        const { error } = await client
          .from('group_subs')
          .update(data)
          .eq('id', subscription.id);
          
        if (error) {
          console.error('Error updating subscription:', error);
          throw new Error(`Failed to update subscription: ${error.message}`);
        }
      } else {
        // Wstaw nowy rekord
        const { error } = await client
          .from('group_subs')
          .insert([data]);
          
        if (error) {
          console.error('Error inserting subscription:', error);
          throw new Error(`Failed to insert subscription: ${error.message}`);
        }
      }
      
      return subscription;
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }
  
  /**
   * Znajduje subskrypcję po ID
   * @param {string} id - ID subskrypcji
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Subscription|null>} Znaleziona subskrypcja lub null
   */
  async findById(id, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    try {
      const { data, error } = await client
        .from('group_subs')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      // Pobierz instrukcje dostępu, jeśli istnieją
      let accessInstructionsData = null;
      
      const { data: accessData, error: accessError } = await client
        .from('access_instructions')
        .select('*')
        .eq('group_sub_id', id)
        .maybeSingle();
      
      if (!accessError && accessData) {
        accessInstructionsData = {
          encryptedData: accessData.encrypted_data,
          encryptionKeyId: accessData.encryption_key_id,
          iv: accessData.iv,
          encryptionVersion: accessData.encryption_version
        };
      }
      
      return Subscription.restore(
        data.id,
        data.group_id,
        data.platform_id,
        data.status,
        data.slots_total,
        data.slots_available,
        data.price_per_slot,
        data.currency,
        data.created_at,
        data.updated_at,
        accessInstructionsData
      );
    } catch (error) {
      console.error('Error in findById:', error);
      return null;
    }
  }
  
  /**
   * Pobiera dostępne sloty dla subskrypcji
   * @param {string} id - ID subskrypcji
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<number>} Liczba dostępnych slotów
   */
  async getAvailableSlots(id, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    try {
      const { data, error } = await client
        .from('group_subs')
        .select('slots_available')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Error fetching available slots:', error);
        throw new Error(`Failed to fetch available slots: ${error.message}`);
      }
      
      return data ? data.slots_available : 0;
    } catch (error) {
      console.error('Error in getAvailableSlots:', error);
      throw error;
    }
  }
  
  /**
   * Aktualizuje dostępne sloty dla subskrypcji
   * @param {string} id - ID subskrypcji
   * @param {number} count - Nowa liczba dostępnych slotów
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<void>}
   */
  async updateAvailableSlots(id, count, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    try {
      const { error } = await client
        .from('group_subs')
        .update({ slots_available: count, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) {
        console.error('Error updating available slots:', error);
        throw new Error(`Failed to update available slots: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updateAvailableSlots:', error);
      throw error;
    }
  }
  
  /**
   * Znajduje subskrypcje według określonych kryteriów
   * @param {Object} criteria - Kryteria wyszukiwania
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Subscription>>} Lista subskrypcji
   */
  async findByCriteria(criteria, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    try {
      let query = client.from('group_subs').select('*');
      
      // Dodaj filtry na podstawie kryteriów
      if (criteria.groupId) {
        query = query.eq('group_id', criteria.groupId);
      }
      
      if (criteria.platformId) {
        query = query.eq('platform_id', criteria.platformId);
      }
      
      if (criteria.status) {
        query = query.eq('status', criteria.status);
      }
      
      if (criteria.availableOnly) {
        query = query.gt('slots_available', 0);
      }
      
      if (criteria.minPrice !== undefined) {
        query = query.gte('price_per_slot', criteria.minPrice);
      }
      
      if (criteria.maxPrice !== undefined) {
        query = query.lte('price_per_slot', criteria.maxPrice);
      }
      
      if (criteria.orderBy) {
        query = query.order(criteria.orderBy, { ascending: criteria.ascending });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      // Dodaj paginację, jeśli podano
      if (criteria.limit) {
        query = query.limit(criteria.limit);
        
        if (criteria.offset) {
          query = query.range(criteria.offset, criteria.offset + criteria.limit - 1);
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching subscriptions:', error);
        throw new Error(`Failed to fetch subscriptions: ${error.message}`);
      }
      
      return data.map(item => Subscription.restore(
        item.id,
        item.group_id,
        item.platform_id,
        item.status,
        item.slots_total,
        item.slots_available,
        item.price_per_slot,
        item.currency,
        item.created_at,
        item.updated_at
      ));
    } catch (error) {
      console.error('Error in findByCriteria:', error);
      throw error;
    }
  }
  
  /**
   * Usuwa subskrypcję
   * @param {string} id - ID subskrypcji
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    try {
      // Usuń najpierw instrukcje dostępu
      await client
        .from('access_instructions')
        .delete()
        .eq('group_sub_id', id);
      
      // Następnie usuń subskrypcję
      const { error } = await client
        .from('group_subs')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting subscription:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in delete:', error);
      return false;
    }
  }
  
  /**
   * Sprawdza, czy subskrypcja istnieje
   * @param {string} id - ID subskrypcji
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    try {
      const { count, error } = await client
        .from('group_subs')
        .select('id', { count: 'exact', head: true })
        .eq('id', id);
        
      if (error) {
        console.error('Error checking subscription existence:', error);
        return false;
      }
      
      return count > 0;
    } catch (error) {
      console.error('Error in exists:', error);
      return false;
    }
  }
  
  /**
   * Zapisuje instrukcje dostępu dla subskrypcji
   * @param {string} subscriptionId - ID subskrypcji
   * @param {Object} accessInstructions - Dane instrukcji dostępu
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<void>}
   */
  async saveAccessInstructions(subscriptionId, accessInstructions, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    try {
      // Sprawdź, czy instrukcje dostępu już istnieją
      const { data, error: checkError } = await client
        .from('access_instructions')
        .select('id')
        .eq('group_sub_id', subscriptionId)
        .maybeSingle();
      
      const now = new Date().toISOString();
      const instructionsData = {
        group_sub_id: subscriptionId,
        encrypted_data: accessInstructions.encryptedData,
        encryption_key_id: accessInstructions.encryptionKeyId,
        iv: accessInstructions.iv,
        encryption_version: accessInstructions.encryptionVersion,
        updated_at: now
      };
      
      if (data) {
        // Aktualizuj istniejące instrukcje
        const { error } = await client
          .from('access_instructions')
          .update(instructionsData)
          .eq('id', data.id);
          
        if (error) {
          console.error('Error updating access instructions:', error);
          throw new Error(`Failed to update access instructions: ${error.message}`);
        }
      } else {
        // Dodaj nowe instrukcje
        const { error } = await client
          .from('access_instructions')
          .insert({
            ...instructionsData,
            created_at: now
          });
          
        if (error) {
          console.error('Error inserting access instructions:', error);
          throw new Error(`Failed to insert access instructions: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error in saveAccessInstructions:', error);
      throw error;
    }
  }
  
  /**
   * Pobiera instrukcje dostępu dla subskrypcji
   * @param {string} subscriptionId - ID subskrypcji
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Object|null>} Dane instrukcji dostępu lub null
   */
  async getAccessInstructions(subscriptionId, transactionClient = null) {
    const client = transactionClient || this.supabaseClient;
    
    try {
      const { data, error } = await client
        .from('access_instructions')
        .select('*')
        .eq('group_sub_id', subscriptionId)
        .maybeSingle();
        
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        subscriptionId: data.group_sub_id,
        encryptedData: data.encrypted_data,
        encryptionKeyId: data.encryption_key_id,
        iv: data.iv,
        encryptionVersion: data.encryption_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in getAccessInstructions:', error);
      return null;
    }
  }
}

module.exports = SupabaseSubscriptionRepository;