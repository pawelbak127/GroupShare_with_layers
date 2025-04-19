// /src/infrastructure/repositories/SupabaseDisputeRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { ApplicationException } from '@/application/exceptions';
import { Id } from '@/domain/shared/value-objects/Id';
import { Dispute } from '@/domain/access/entities/Dispute';
import { DisputeType } from '@/domain/access/value-objects/DisputeType';
import { DisputeStatus } from '@/domain/access/value-objects/DisputeStatus';

/**
 * Implementacja repozytorium sporów używająca Supabase
 * @implements {RepositoryPort}
 */
class SupabaseDisputeRepository extends RepositoryPort {
  /**
   * Zapisuje spór
   * @param {Dispute} dispute Spór do zapisania
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Dispute>} Zapisany spór
   */
  async save(dispute, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      // Przygotuj dane do zapisania
      const disputeData = {
        id: dispute.id,
        reporter_id: dispute.reporterId,
        reported_entity_type: dispute.reportedEntityType,
        reported_entity_id: dispute.reportedEntityId,
        transaction_id: dispute.transactionId,
        dispute_type: dispute.disputeType.toString(),
        description: dispute.description,
        status: dispute.status.toString(),
        evidence_required: dispute.evidenceRequired,
        resolution_deadline: dispute.resolutionDeadline.toISOString(),
        resolution_notes: dispute.resolutionNotes,
        updated_at: new Date().toISOString()
      };
      
      // Jeśli to nowy spór, dodaj datę utworzenia
      if (!await this.exists(dispute.id, client)) {
        disputeData.created_at = dispute.createdAt.toISOString();
      }
      
      // Zapisz evidence jako JSON
      if (dispute.evidence && dispute.evidence.length > 0) {
        disputeData.evidence = JSON.stringify(dispute.evidence);
      }
      
      // Zapisz spór
      const { data, error } = await client
        .from('disputes')
        .upsert(disputeData)
        .select()
        .single();
      
      if (error) {
        console.error('Error saving dispute:', error);
        throw new ApplicationException('Failed to save dispute', 'DATABASE_ERROR');
      }
      
      // Zwróć zaktualizowany obiekt domeny
      return this.mapToEntity(data);
    } catch (error) {
      console.error('Exception in save:', error);
      throw error instanceof ApplicationException
        ? error
        : new ApplicationException('Failed to save dispute', 'DATABASE_ERROR');
    }
  }
  
  /**
   * Pobiera spór po ID
   * @param {string} id ID sporu
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Dispute|null>} Znaleziony spór lub null
   */
  async findById(id, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const { data, error } = await client
        .from('disputes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching dispute:', error);
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      return this.mapToEntity(data);
    } catch (error) {
      console.error('Exception in findById:', error);
      return null;
    }
  }
  
  /**
   * Usuwa spór
   * @param {string} id ID sporu
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<boolean>} Czy usunięto
   */
  async delete(id, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const { error } = await client
        .from('disputes')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting dispute:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception in delete:', error);
      return false;
    }
  }
  
  /**
   * Sprawdza czy spór istnieje
   * @param {string} id ID sporu
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<boolean>} Czy istnieje
   */
  async exists(id, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const { count, error } = await client
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .eq('id', id);
      
      if (error) {
        console.error('Error checking dispute existence:', error);
        return false;
      }
      
      return count > 0;
    } catch (error) {
      console.error('Exception in exists:', error);
      return false;
    }
  }
  
  /**
   * Znajduje spory zgłoszone przez użytkownika
   * @param {string} reporterId ID zgłaszającego
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Dispute>>} Lista sporów
   */
  async findByReporterId(reporterId, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const { data, error } = await client
        .from('disputes')
        .select('*')
        .eq('reporter_id', reporterId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching disputes by reporter:', error);
        return [];
      }
      
      return data.map(dispute => this.mapToEntity(dispute));
    } catch (error) {
      console.error('Exception in findByReporterId:', error);
      return [];
    }
  }
  
  /**
   * Znajduje spory dotyczące encji
   * @param {string} entityType Typ encji
   * @param {string} entityId ID encji
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Dispute>>} Lista sporów
   */
  async findByReportedEntity(entityType, entityId, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const { data, error } = await client
        .from('disputes')
        .select('*')
        .eq('reported_entity_type', entityType)
        .eq('reported_entity_id', entityId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching disputes by entity:', error);
        return [];
      }
      
      return data.map(dispute => this.mapToEntity(dispute));
    } catch (error) {
      console.error('Exception in findByReportedEntity:', error);
      return [];
    }
  }
  
  /**
   * Znajduje spory związane z transakcją
   * @param {string} transactionId ID transakcji
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Dispute>>} Lista sporów
   */
  async findByTransactionId(transactionId, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const { data, error } = await client
        .from('disputes')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching disputes by transaction:', error);
        return [];
      }
      
      return data.map(dispute => this.mapToEntity(dispute));
    } catch (error) {
      console.error('Exception in findByTransactionId:', error);
      return [];
    }
  }
  
  /**
   * Znajduje spory według statusu
   * @param {string} status Status sporu
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Dispute>>} Lista sporów
   */
  async findByStatus(status, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const { data, error } = await client
        .from('disputes')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching disputes by status:', error);
        return [];
      }
      
      return data.map(dispute => this.mapToEntity(dispute));
    } catch (error) {
      console.error('Exception in findByStatus:', error);
      return [];
    }
  }
  
  /**
   * Znajduje oczekujące spory
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Dispute>>} Lista sporów
   */
  async findPendingDisputes(transactionClient = null) {
    return this.findByStatus('open', transactionClient);
  }
  
  /**
   * Aktualizuje status sporu
   * @param {string} id ID sporu
   * @param {string} status Nowy status
   * @param {string} [resolutionNotes] Notatki z rozwiązania
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<boolean>} Czy zaktualizowano
   */
  async updateStatus(id, status, resolutionNotes = null, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (resolutionNotes) {
        updateData.resolution_notes = resolutionNotes;
      }
      
      const { error } = await client
        .from('disputes')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating dispute status:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception in updateStatus:', error);
      return false;
    }
  }
  
  /**
   * Dodaje dowód do sporu
   * @param {string} id ID sporu
   * @param {Object} evidence Dowód do dodania
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<boolean>} Czy dodano
   */
  async addEvidence(id, evidence, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      // Najpierw pobierz obecne dowody
      const { data, error: fetchError } = await client
        .from('disputes')
        .select('evidence')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching dispute evidence:', fetchError);
        return false;
      }
      
      // Parsuj istniejące dowody lub utwórz nową tablicę
      let currentEvidence = [];
      if (data.evidence) {
        try {
          currentEvidence = JSON.parse(data.evidence);
        } catch (e) {
          console.error('Error parsing evidence JSON:', e);
        }
      }
      
      // Dodaj nowy dowód z timestampem
      const newEvidence = {
        ...evidence,
        added_at: new Date().toISOString()
      };
      
      currentEvidence.push(newEvidence);
      
      // Zaktualizuj spór
      const { error: updateError } = await client
        .from('disputes')
        .update({
          evidence: JSON.stringify(currentEvidence),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) {
        console.error('Error updating dispute evidence:', updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception in addEvidence:', error);
      return false;
    }
  }
  
  /**
   * Mapuje dane z bazy na obiekt domeny
   * @param {Object} data Dane z bazy
   * @returns {Dispute} Obiekt domeny
   * @private
   */
  mapToEntity(data) {
    // Parsuj evidence jeśli istnieje
    let evidence = [];
    if (data.evidence) {
      try {
        evidence = JSON.parse(data.evidence);
      } catch (e) {
        console.error('Error parsing evidence JSON:', e);
      }
    }
    
    return Dispute.restore(
      data.id,
      data.reporter_id,
      data.reported_entity_type,
      data.reported_entity_id,
      data.transaction_id,
      data.dispute_type,
      data.description,
      data.status,
      data.evidence_required,
      new Date(data.resolution_deadline),
      new Date(data.created_at),
      new Date(data.updated_at),
      data.resolution_notes || '',
      evidence
    );
  }
}

export default SupabaseDisputeRepository;