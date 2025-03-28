import crypto from 'crypto';
import supabase from '../supabase-client';

/**
 * Serwis do identyfikacji urządzeń użytkowników
 */
export class DeviceFingerprinter {
  // Generowanie odcisku urządzenia
  generateFingerprint(req) {
    // Zbieranie danych do fingerprinta
    const data = {
      ip: req.headers['x-forwarded-for'] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      acceptLanguage: req.headers['accept-language'] || '',
      acceptEncoding: req.headers['accept-encoding'] || '',
      acceptCharset: req.headers['accept-charset'] || ''
    };
    
    // Generowanie hasha z danych
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
  
  // Zapisywanie odcisku urządzenia dla użytkownika
  async storeDeviceFingerprint(userId, fingerprint) {
    try {
      // Sprawdzenie, czy już istnieje
      const { data, error } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('user_id', userId)
        .eq('fingerprint', fingerprint)
        .single();
      
      if (error) {
        // Jeśli nie znaleziono, dodaj nowy
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('device_fingerprints')
            .insert({
              user_id: userId,
              fingerprint,
              first_seen_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
              counter: 1
            });
            
          if (insertError) throw insertError;
        } else {
          throw error;
        }
      } else {
        // Aktualizacja istniejącego
        const { error: updateError } = await supabase
          .from('device_fingerprints')
          .update({
            last_seen_at: new Date().toISOString(),
            counter: data.counter + 1
          })
          .eq('id', data.id);
          
        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error storing device fingerprint:', error);
      // Nie rzucamy wyjątku, aby nie blokować głównej funkcjonalności
    }
  }
  
  // Sprawdzanie, czy odcisk urządzenia jest znany
  async isKnownDevice(userId, fingerprint) {
    try {
      const { data, error } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('user_id', userId)
        .eq('fingerprint', fingerprint);
      
      if (error) return false;
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking device fingerprint:', error);
      return false;
    }
  }
}