// /src/infrastructure/repositories/SupabaseAccessInstructionRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';

/**
 * Implementacja repozytorium instrukcji dostępu używająca Supabase
 * @implements {RepositoryPort<Object>}
 */
class SupabaseAccessInstructionRepository extends RepositoryPort {
  /**
   * Zapisuje instrukcje dostępu
   * @param {Object} instructions Instrukcje do zapisania
   * @returns {Promise<Object>} Zapisane instrukcje
   */
  async save(instructions) {
    // Przygotuj dane do zapisu
    const instructionsData = {
      group_sub_id: instructions.subscriptionId,
      encrypted_data: instructions.encryptedData,
      data_key_enc: instructions.dataKeyEnc || 'dummy-key',
      encryption_key_id: instructions.encryptionKeyId,
      iv: instructions.iv,
      encryption_version: instructions.encryptionVersion,
      updated_at: new Date().toISOString()
    };
    
    // Sprawdź czy instrukcje już istnieją
    const exists = await this.exists(instructions.subscriptionId);
    
    if (exists) {
      // Aktualizuj istniejące
      const { data, error } = await supabaseAdmin
        .from('access_instructions')
        .update(instructionsData)
        .eq('group_sub_id', instructions.subscriptionId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update access instructions: ${error.message}`);
      }
      
      return data;
    } else {
      // Utwórz nowe
      instructionsData.created_at = new Date().toISOString();
      
      const { data, error } = await supabaseAdmin
        .from('access_instructions')
        .insert(instructionsData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create access instructions: ${error.message}`);
      }
      
      return data;
    }
  }
  
  /**
   * Znajduje instrukcje dostępu po ID subskrypcji
   * @param {string} subscriptionId ID subskrypcji
   * @returns {Promise<Object|null>} Znalezione instrukcje lub null
   */
  async findBySubscriptionId(subscriptionId) {
    const { data, error } = await supabaseAdmin
      .from('access_instructions')
      .select('*')
      .eq('group_sub_id', subscriptionId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      subscriptionId: data.group_sub_id,
      encryptedData: data.encrypted_data,
      dataKeyEnc: data.data_key_enc,
      encryptionKeyId: data.encryption_key_id,
      iv: data.iv,
      encryptionVersion: data.encryption_version,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
  
  /**
   * Usuwa instrukcje dostępu
   * @param {string} subscriptionId ID subskrypcji
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(subscriptionId) {
    const { error } = await supabaseAdmin
      .from('access_instructions')
      .delete()
      .eq('group_sub_id', subscriptionId);
    
    return !error;
  }
  
  /**
   * Sprawdza czy instrukcje dostępu istnieją
   * @param {string} subscriptionId ID subskrypcji
   * @returns {Promise<boolean>} Czy istnieją
   */
  async exists(subscriptionId) {
    const { count, error } = await supabaseAdmin
      .from('access_instructions')
      .select('*', { count: 'exact', head: true })
      .eq('group_sub_id', subscriptionId);
    
    return !error && count > 0;
  }
}

export default SupabaseAccessInstructionRepository;