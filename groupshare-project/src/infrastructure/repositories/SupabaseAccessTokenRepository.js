// /src/infrastructure/repositories/SupabaseAccessTokenRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';

/**
 * Implementacja repozytorium tokenów dostępu używająca Supabase
 * @implements {RepositoryPort<Object>}
 */
class SupabaseAccessTokenRepository extends RepositoryPort {
  /**
   * Zapisuje token dostępu
   * @param {Object} token Token do zapisania
   * @returns {Promise<Object>} Zapisany token
   */
  async save(token) {
    // Przygotuj dane do zapisu
    const tokenData = {
      id: token.id,
      purchase_record_id: token.purchaseId,
      token_hash: token.tokenHash,
      expires_at: token.expiresAt,
      used: token.used || false,
      used_at: token.usedAt || null,
      ip_address: token.ipAddress || null,
      user_agent: token.userAgent || null,
      created_at: token.createdAt || new Date().toISOString()
    };
    
    // Zapisz w bazie danych
    const { data, error } = await supabaseAdmin
      .from('access_tokens')
      .upsert(tokenData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save access token: ${error.message}`);
    }
    
    return {
      id: data.id,
      purchaseId: data.purchase_record_id,
      tokenHash: data.token_hash,
      expiresAt: data.expires_at,
      used: data.used,
      usedAt: data.used_at,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      createdAt: data.created_at
    };
  }
  
  /**
   * Znajduje token dostępu po ID
   * @param {string} id ID tokenu
   * @returns {Promise<Object|null>} Znaleziony token lub null
   */
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('access_tokens')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      purchaseId: data.purchase_record_id,
      tokenHash: data.token_hash,
      expiresAt: data.expires_at,
      used: data.used,
      usedAt: data.used_at,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      createdAt: data.created_at
    };
  }
  
  /**
   * Usuwa token dostępu
   * @param {string} id ID tokenu
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('access_tokens')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * Sprawdza czy token dostępu istnieje
   * @param {string} id ID tokenu
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id) {
    const { count, error } = await supabaseAdmin
      .from('access_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Znajduje tokeny dla zakupu
   * @param {string} purchaseId ID zakupu
   * @returns {Promise<Object[]>} Lista tokenów
   */
  async findByPurchaseId(purchaseId) {
    const { data, error } = await supabaseAdmin
      .from('access_tokens')
      .select('*')
      .eq('purchase_record_id', purchaseId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch tokens by purchase ID: ${error.message}`);
    }
    
    return data.map(token => ({
      id: token.id,
      purchaseId: token.purchase_record_id,
      tokenHash: token.token_hash,
      expiresAt: token.expires_at,
      used: token.used,
      usedAt: token.used_at,
      ipAddress: token.ip_address,
      userAgent: token.user_agent,
      createdAt: token.created_at
    }));
  }
  
  /**
   * Znajduje token po hashu i ID zakupu
   * @param {string} purchaseId ID zakupu
   * @param {string} tokenHash Hash tokenu
   * @returns {Promise<Object|null>} Znaleziony token lub null
   */
  async findByPurchaseIdAndHash(purchaseId, tokenHash) {
    const { data, error } = await supabaseAdmin
      .from('access_tokens')
      .select('*')
      .eq('purchase_record_id', purchaseId)
      .eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      purchaseId: data.purchase_record_id,
      tokenHash: data.token_hash,
      expiresAt: data.expires_at,
      used: data.used,
      usedAt: data.used_at,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      createdAt: data.created_at
    };
  }
  
  /**
   * Oznacza token jako użyty
   * @param {string} id ID tokenu
   * @param {string} ipAddress Adres IP
   * @param {string} userAgent User agent
   * @returns {Promise<Object>} Zaktualizowany token
   */
  async markAsUsed(id, ipAddress, userAgent) {
    const { data, error } = await supabaseAdmin
      .from('access_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to mark token as used: ${error.message}`);
    }
    
    return {
      id: data.id,
      purchaseId: data.purchase_record_id,
      tokenHash: data.token_hash,
      expiresAt: data.expires_at,
      used: data.used,
      usedAt: data.used_at,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      createdAt: data.created_at
    };
  }
}

export default SupabaseAccessTokenRepository;