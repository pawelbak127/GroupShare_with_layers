// /src/infrastructure/repositories/SupabaseSecurityLogRepository.js

import RepositoryPort from '@/application/ports/persistence/RepositoryPort';
import supabaseAdmin from '@/lib/database/supabase-admin-client';
import { ApplicationException } from '@/application/exceptions';

/**
 * Implementacja repozytorium logów bezpieczeństwa używająca Supabase
 * @implements {RepositoryPort}
 */
class SupabaseSecurityLogRepository extends RepositoryPort {
  /**
   * Inicjalizuje repozytorium
   * @param {Object} options - Opcje konfiguracyjne
   */
  constructor(options = {}) {
    super();
    this.options = {
      tableName: 'security_logs',
      enableRealTimeLogging: false,
      retentionDays: 90, // dni przechowywania logów
      ...options
    };
  }
  
  /**
   * Tworzy nowy wpis logu bezpieczeństwa
   * @param {Object} logEntry - Dane wpisu logu
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Object>} - Utworzony wpis logu
   */
  async create(logEntry, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      // Dodaj timestamp jeśli nie podano
      if (!logEntry.created_at) {
        logEntry.created_at = new Date().toISOString();
      }
      
      // Serializuj pole details jeśli jest obiektem
      if (logEntry.details && typeof logEntry.details === 'object') {
        logEntry.details = JSON.stringify(logEntry.details);
      }
      
      const { data, error } = await client
        .from(this.options.tableName)
        .insert([logEntry])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating security log:', error);
        
        // W przypadku błędu nie rzucamy wyjątku, ale logujemy problem
        // Nie chcemy, aby błędy logowania przerywały główne operacje
        return null;
      }
      
      // W trybie rzeczywistym, można by wysłać powiadomienie o ważnych zdarzeniach
      if (this.options.enableRealTimeLogging && this.isCriticalAction(logEntry.action_type)) {
        await this.notifySecurityTeam(data);
      }
      
      return data;
    } catch (error) {
      console.error('Exception in security log creation:', error);
      // Nie rzucamy wyjątku, aby nie przerywać głównych operacji
      return null;
    }
  }

  /**
   * Pobiera wpis logu po ID
   * @param {string} id - ID wpisu logu
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Object|null>} - Wpis logu lub null
   */
  async findById(id, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      const { data, error } = await client
        .from(this.options.tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching security log:', error);
        return null;
      }
      
      // Parsuj pole details jeśli jest stringiem JSON
      if (data && data.details && typeof data.details === 'string') {
        try {
          data.details = JSON.parse(data.details);
        } catch (e) {
          // Jeśli nie udało się sparsować, pozostaw jako string
        }
      }
      
      return data;
    } catch (error) {
      console.error('Exception in findById:', error);
      return null;
    }
  }
  
  /**
   * Wyszukuje logi bezpieczeństwa według kryteriów
   * @param {Object} criteria - Kryteria wyszukiwania
   * @param {Object} pagination - Opcje paginacji
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Object>>} - Lista wpisów logów
   */
  async findByCriteria(criteria, pagination = {}, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      
      let query = client
        .from(this.options.tableName)
        .select('*');
      
      // Dodaj filtry na podstawie kryteriów
      if (criteria.userId) {
        query = query.eq('user_id', criteria.userId);
      }
      
      if (criteria.actionType) {
        query = query.eq('action_type', criteria.actionType);
      }
      
      if (criteria.resourceType) {
        query = query.eq('resource_type', criteria.resourceType);
      }
      
      if (criteria.resourceId) {
        query = query.eq('resource_id', criteria.resourceId);
      }
      
      if (criteria.status) {
        query = query.eq('status', criteria.status);
      }
      
      if (criteria.startDate) {
        query = query.gte('created_at', criteria.startDate);
      }
      
      if (criteria.endDate) {
        query = query.lte('created_at', criteria.endDate);
      }
      
      // Dodaj paginację
      if (pagination.limit) {
        query = query.limit(pagination.limit);
      }
      
      if (pagination.offset) {
        query = query.range(pagination.offset, pagination.offset + (pagination.limit || 20) - 1);
      }
      
      // Domyślnie sortuj malejąco według daty utworzenia
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching security logs:', error);
        return [];
      }
      
      // Parsuj pole details jeśli jest stringiem JSON
      return data.map(log => {
        if (log.details && typeof log.details === 'string') {
          try {
            log.details = JSON.parse(log.details);
          } catch (e) {
            // Jeśli nie udało się sparsować, pozostaw jako string
          }
        }
        return log;
      });
    } catch (error) {
      console.error('Exception in findByCriteria:', error);
      return [];
    }
  }
  
  /**
   * Pobiera logi związane z użytkownikiem
   * @param {string} userId - ID użytkownika
   * @param {number} limit - Limit wyników
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Object>>} - Lista wpisów logów
   */
  async findByUserId(userId, limit = 20, transactionClient = null) {
    return this.findByCriteria({ userId }, { limit }, transactionClient);
  }
  
  /**
   * Pobiera logi związane z zasobem
   * @param {string} resourceType - Typ zasobu
   * @param {string} resourceId - ID zasobu
   * @param {number} limit - Limit wyników
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<Array<Object>>} - Lista wpisów logów
   */
  async findByResource(resourceType, resourceId, limit = 20, transactionClient = null) {
    return this.findByCriteria({ resourceType, resourceId }, { limit }, transactionClient);
  }
  
  /**
   * Czyści stare logi bezpieczeństwa
   * @param {number} olderThanDays - Liczba dni, starsze logi zostaną usunięte
   * @param {Object} [transactionClient] - Opcjonalny klient transakcji
   * @returns {Promise<number>} - Liczba usuniętych wpisów
   */
  async cleanupOldLogs(olderThanDays = null, transactionClient = null) {
    try {
      const client = transactionClient || supabaseAdmin;
      const days = olderThanDays || this.options.retentionDays;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffDateString = cutoffDate.toISOString();
      
      // Najpierw pobierz liczbę wpisów do usunięcia
      const { count, error: countError } = await client
        .from(this.options.tableName)
        .select('id', { count: 'exact', head: true })
        .lt('created_at', cutoffDateString);
      
      if (countError) {
        console.error('Error counting old security logs:', countError);
        return 0;
      }
      
      // Usuń stare wpisy
      const { error: deleteError } = await client
        .from(this.options.tableName)
        .delete()
        .lt('created_at', cutoffDateString);
      
      if (deleteError) {
        console.error('Error deleting old security logs:', deleteError);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Exception in cleanupOldLogs:', error);
      return 0;
    }
  }
  
  /**
   * Sprawdza, czy akcja jest krytyczna (wymagająca powiadomienia)
   * @param {string} actionType - Typ akcji
   * @returns {boolean} - Czy akcja jest krytyczna
   * @private
   */
  isCriticalAction(actionType) {
    const criticalActions = [
      'login_failed',
      'account_locked',
      'password_reset',
      'permissions_changed',
      'data_export',
      'admin_action',
      'security_setting_changed',
      'api_key_generated',
      'suspicious_activity'
    ];
    
    return criticalActions.includes(actionType);
  }
  
  /**
   * Powiadamia zespół bezpieczeństwa o krytycznej akcji
   * @param {Object} logEntry - Wpis logu
   * @returns {Promise<void>}
   * @private
   */
  async notifySecurityTeam(logEntry) {
    // W prawdziwej implementacji, można by wysłać powiadomienie przez:
    // - Email
    // - SMS
    // - Webhook
    // - Kanał Slack itp.
    
    console.log('SECURITY ALERT:', JSON.stringify(logEntry, null, 2));
    
    // Symulacja wysyłki powiadomienia
    if (process.env.SECURITY_WEBHOOK_URL) {
      try {
        // W rzeczywistym kodzie użylibyśmy np. fetch lub axios
        // await fetch(process.env.SECURITY_WEBHOOK_URL, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     type: 'security_alert',
        //     data: logEntry
        //   })
        // });
        
        console.log(`Would send security alert to webhook for action: ${logEntry.action_type}`);
      } catch (error) {
        console.error('Failed to send security webhook notification:', error);
      }
    }
  }
}

export default SupabaseSecurityLogRepository;