// /src/infrastructure/repositories/SupabaseGroupRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { Group } from '@/domain/group/Group';
import { GroupMember } from '@/domain/group/entities/GroupMember';
import { Id } from '@/domain/shared/value-objects/Id';
import { GroupRole } from '@/domain/group/value-objects/GroupRole';
import { GroupStatus } from '@/domain/group/value-objects/GroupStatus';
import { MembershipStatus } from '@/domain/group/value-objects/MembershipStatus';

/**
 * Implementacja repozytorium grup używająca Supabase
 * @implements {RepositoryPort<Group>}
 */
class SupabaseGroupRepository extends RepositoryPort {
  /**
   * Zapisuje grupę
   * @param {Group} group Grupa do zapisania
   * @returns {Promise<Group>} Zapisana grupa
   */
  async save(group) {
    // Przygotuj dane do zapisu
    const groupData = {
      id: group.id,
      name: group.name,
      description: group.description,
      owner_id: group.ownerId,
      updated_at: new Date().toISOString()
    };
    
    // Jeśli to nowa grupa, dodaj datę utworzenia
    if (!await this.exists(group.id)) {
      groupData.created_at = group.createdAt.toISOString();
    }
    
    // Zapisz w bazie danych
    const { data, error } = await supabaseAdmin
      .from('groups')
      .upsert(groupData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save group: ${error.message}`);
    }
    
    // Zwróć zaktualizowany obiekt domeny
    return Group.restore(
      data.id,
      data.name,
      data.description,
      data.owner_id,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }
  
  /**
   * Znajduje grupę po ID
   * @param {string} id ID grupy
   * @returns {Promise<Group|null>} Znaleziona grupa lub null
   */
  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return Group.restore(
      data.id,
      data.name,
      data.description,
      data.owner_id,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }
  
  /**
   * Usuwa grupę
   * @param {string} id ID grupy
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id) {
    const { error } = await supabaseAdmin
      .from('groups')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * Sprawdza czy grupa istnieje
   * @param {string} id ID grupy
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id) {
    const { count, error } = await supabaseAdmin
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Znajduje grupy po ID właściciela
   * @param {string} ownerId ID właściciela
   * @returns {Promise<Group[]>} Lista grup
   */
  async findByOwnerId(ownerId) {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('owner_id', ownerId);
    
    if (error) {
      throw new Error(`Failed to fetch groups by owner ID: ${error.message}`);
    }
    
    return data.map(group => Group.restore(
      group.id,
      group.name,
      group.description,
      group.owner_id,
      new Date(group.created_at),
      new Date(group.updated_at)
    ));
  }
  
  /**
   * Znajduje grupy, do których należy użytkownik
   * @param {string} userId ID użytkownika
   * @returns {Promise<GroupMember[]>} Lista członkowstw
   */
  async findByMemberId(userId) {
    const { data, error } = await supabaseAdmin
      .from('group_members')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Failed to fetch groups by member ID: ${error.message}`);
    }
    
    return data.map(member => GroupMember.restore(
      member.id,
      member.group_id,
      member.user_id,
      member.role,
      member.status,
      new Date(member.created_at),
      new Date(member.updated_at)
    ));
  }
  
  /**
   * Znajduje członkowstwo użytkownika w grupie
   * @param {string} userId ID użytkownika
   * @param {string} groupId ID grupy
   * @returns {Promise<GroupMember|null>} Członkowstwo lub null
   */
  async findMembershipByUserAndGroup(userId, groupId) {
    const { data, error } = await supabaseAdmin
      .from('group_members')
      .select('*')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return GroupMember.restore(
      data.id,
      data.group_id,
      data.user_id,
      data.role,
      data.status,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }
  
  /**
   * Zapisuje członkowstwo
   * @param {GroupMember} member Członkowstwo do zapisania
   * @returns {Promise<GroupMember>} Zapisane członkowstwo
   */
  async saveMembership(member) {
    // Przygotuj dane do zapisu
    const memberData = {
      id: member.id,
      group_id: member.groupId,
      user_id: member.userId,
      role: member.role.toString(),
      status: member.status.toString(),
      updated_at: new Date().toISOString()
    };
    
    // Sprawdź czy członkowstwo już istnieje
    const exists = await this.membershipExists(member.id);
    
    if (!exists) {
      memberData.created_at = member.createdAt.toISOString();
    }
    
    // Zapisz w bazie danych
    const { data, error } = await supabaseAdmin
      .from('group_members')
      .upsert(memberData)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save group membership: ${error.message}`);
    }
    
    // Zwróć zaktualizowany obiekt domeny
    return GroupMember.restore(
      data.id,
      data.group_id,
      data.user_id,
      data.role,
      data.status,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }
  
  /**
   * Sprawdza czy członkowstwo istnieje
   * @param {string} id ID członkowstwa
   * @returns {Promise<boolean>} Czy istnieje
   */
  async membershipExists(id) {
    const { count, error } = await supabaseAdmin
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    return !error && count > 0;
  }
  
  /**
   * Usuwa członkowstwo
   * @param {string} id ID członkowstwa
   * @returns {Promise<boolean>} Czy usunięto
   */
  async removeMembership(id) {
    const { error } = await supabaseAdmin
      .from('group_members')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  /**
   * Aktualizuje członkowstwo
   * @param {GroupMember} member Członkowstwo
   * @returns {Promise<GroupMember>} Zaktualizowane członkowstwo
   */
  async updateMembership(member) {
    return this.saveMembership(member);
  }
  
  /**
   * Zlicza członków grupy
   * @param {string} groupId ID grupy
   * @returns {Promise<number>} Liczba członków
   */
  async countMembers(groupId) {
    const { count, error } = await supabaseAdmin
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'active');
    
    if (error) {
      throw new Error(`Failed to count group members: ${error.message}`);
    }
    
    return count || 0;
  }
  
  /**
   * Zlicza subskrypcje grupy
   * @param {string} groupId ID grupy
   * @returns {Promise<number>} Liczba subskrypcji
   */
  async countSubscriptions(groupId) {
    const { count, error } = await supabaseAdmin
      .from('group_subs')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);
    
    if (error) {
      throw new Error(`Failed to count group subscriptions: ${error.message}`);
    }
    
    return count || 0;
  }
  
  /**
   * Znajduje członków grupy
   * @param {string} groupId ID grupy
   * @returns {Promise<GroupMember[]>} Lista członków
   */
  async findMembers(groupId) {
    const { data, error } = await supabaseAdmin
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);
    
    if (error) {
      throw new Error(`Failed to fetch group members: ${error.message}`);
    }
    
    return data.map(member => GroupMember.restore(
      member.id,
      member.group_id,
      member.user_id,
      member.role,
      member.status,
      new Date(member.created_at),
      new Date(member.updated_at)
    ));
  }
}

export default SupabaseGroupRepository;