import supabase from '../supabase-client';

/**
 * Serwis logowania zdarzeń bezpieczeństwa
 */
export class SecurityLogger {
  constructor(userId = null) {
    this.userId = userId;
  }
  
  // Logowanie zdarzenia bezpieczeństwa
  async logSecurityEvent(actionType, resourceType, resourceId, status, details = {}) {
    try {
      const logEntry = {
        user_id: this.userId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        status: status,
        ip_address: this.getClientIp(),
        user_agent: this.getUserAgent(),
        details: JSON.stringify(details),
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('security_logs')
        .insert(logEntry);
      
      if (error) {
        console.error('Error logging security event:', error);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Nie rzucamy wyjątku, aby nie blokować głównej funkcjonalności
    }
  }
  
  // Pobranie logów dla zasobu
  async getLogsForResource(resourceType, resourceId, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching security logs:', error);
      throw new Error('Failed to fetch security logs');
    }
  }
  
  // Pobranie logów dla użytkownika
  async getLogsForUser(userId, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching user security logs:', error);
      throw new Error('Failed to fetch user security logs');
    }
  }
  
  // Pomocnicze metody do pobrania informacji o kliencie
  getClientIp() {
    return '127.0.0.1'; // W rzeczywistej implementacji z kontekstu żądania
  }
  
  getUserAgent() {
    return 'Test User Agent'; // W rzeczywistej implementacji z kontekstu żądania
  }
}