// /src/infrastructure/repositories/SupabaseUserRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { User } from '@/domain/user/User';
import { Id } from '@/domain/shared/value-objects/Id';
import { Email } from '@/domain/shared/value-objects/Email';
import { ProfileType } from '@/domain/user/value-objects/ProfileType';
import { VerificationLevel } from '@/domain/user/value-objects/VerificationLevel';

/**
 * Implementacja repozytorium użytkowników używająca Supabase
 * @implements {RepositoryPort<User>}
 */
class SupabaseUserRepository extends RepositoryPort {
  /**
   * Zapisuje użytkownika
   * @param {User} user Użytkownik do zapisania
   * @returns {Promise<User>} Zapisany użytkownik
   */
  async save(user) {
    // Przygotuj dane do zapisu
    const userData = {
      id: user.id,
      external_auth_id: user.externalAuthId,
      display_name: user.displayName,
      email: user.email,
      profile_type: user.profileType.toString(),
      verification_level: user.verificationLevel.toString(),
      bio: user.bio,
      avatar_url: user.avatarUrl,
      rating_avg: user.ratingAvg,
      rating_count: user.ratingCount,
      updated_at: new Date().toISOString()
    };
    
    // Jeśli to nowy użytkownik, dodaj datę utworzenia
    if (!await this.exists(user.id)) {
      userData.created_at = user.createdAt.toISOString();
    }
    
    // Zapisz w bazie danych
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert(userData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save user: ${error.message}`);
    }
    
    // Zwróć zaktualizowany obiekt domeny
    return User.restore(
      data.id,
      data.external_auth_id,
      data.display_name,
      data.email,
      data.profile_type,
      data.verification_level,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.bio,
      data.avatar_url,
      data.rating_avg,
      data.rating_count
    );
  }
  
  /**
   * Znajduje użytkownika po ID
   * @param {string} id ID użytkownika
   * @returns {Promise<User|null>} Znaleziony użytkownik lub null
   */
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return User.restore(
      data.id,
      data.external_auth_id,
      data.display_name,
      data.email,
      data.profile_type,
      data.verification_level,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.bio,
      data.avatar_url,
      data.rating_avg,
      data.rating_count
    );
  }
  
  /**
   * Znajduje użytkownika po zewnętrznym ID autoryzacji
   * @param {string} externalAuthId Zewnętrzne ID autoryzacji
   * @returns {Promise<User|null>} Znaleziony użytkownik lub null
   */
  async findByExternalAuthId(externalAuthId) {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('external_auth_id', externalAuthId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return User.restore(
      data.id,
      data.external_auth_id,
      data.display_name,
      data.email,
      data.profile_type,
      data.verification_level,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.bio,
      data.avatar_url,
      data.rating_avg,
      data.rating_count
    );
  }
  
  /**
   * Znajduje użytkownika po adresie email
   * @param {string} email Adres email
   * @returns {Promise<User|null>} Znaleziony użytkownik lub null
   */
  async findByEmail(email) {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return User.restore(
      data.id,
      data.external_auth_id,
      data.display_name,
      data.email,
      data.profile_type,
      data.verification_level,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.bio,
      data.avatar_url,
      data.rating_avg,
      data.rating_count
    );
  }
  
  /**
   * Usuwa użytkownika
   * @param {string} id ID użytkownika
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * Sprawdza czy użytkownik istnieje
   * @param {string} id ID użytkownika
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id) {
    const { count, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Znajduje użytkowników według poziomu weryfikacji
   * @param {string} level Poziom weryfikacji
   * @returns {Promise<User[]>} Lista użytkowników
   */
  async findByVerificationLevel(level) {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('verification_level', level);
    
    if (error) {
      throw new Error(`Failed to fetch users by verification level: ${error.message}`);
    }
    
    return data.map(user => User.restore(
      user.id,
      user.external_auth_id,
      user.display_name,
      user.email,
      user.profile_type,
      user.verification_level,
      new Date(user.created_at),
      new Date(user.updated_at),
      user.bio,
      user.avatar_url,
      user.rating_avg,
      user.rating_count
    ));
  }
}

export default SupabaseUserRepository;