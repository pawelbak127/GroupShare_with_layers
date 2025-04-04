// src/cron/key-rotation.js
import { KeyManagementService } from '../lib/security/key-management-service';
import supabaseAdmin from '../lib/supabase-admin-client';

async function rotateExpiredKeys() {
  console.log('Starting scheduled key rotation job');
  
  try {
    const kms = new KeyManagementService(process.env.ENCRYPTION_MASTER_KEY);
    
    // Pobierz klucze, które wymagają rotacji
    const keysToRotate = await kms.getKeysRequiringRotation(null, 30);
    console.log(`Found ${keysToRotate.length} keys requiring rotation`);
    
    // Przeprowadź rotację każdego klucza
    for (const key of keysToRotate) {
      try {
        console.log(`Rotating key ${key.id} of type ${key.key_type}`);
        const newKeyId = await kms.rotateKey(key.id);
        
        // Dodaj wpis w logu bezpieczeństwa
        await supabaseAdmin.from('security_logs').insert({
          action_type: 'key_rotation',
          resource_type: 'encryption_key',
          resource_id: key.id,
          status: 'success',
          details: JSON.stringify({ 
            key_type: key.key_type, 
            new_key_id: newKeyId 
          }),
          created_at: new Date().toISOString()
        });
        
        console.log(`Successfully rotated key ${key.id} to new key ${newKeyId}`);
      } catch (rotateError) {
        console.error(`Failed to rotate key ${key.id}:`, rotateError);
        
        // Log error but continue with other keys
        await supabaseAdmin.from('security_logs').insert({
          action_type: 'key_rotation',
          resource_type: 'encryption_key',
          resource_id: key.id,
          status: 'failure',
          details: JSON.stringify({ 
            error: rotateError.message || 'Unknown error' 
          }),
          created_at: new Date().toISOString()
        });
      }
    }
    
    console.log('Key rotation job completed');
  } catch (error) {
    console.error('Key rotation job failed:', error);
  }
}

// Wykonaj rotację kluczy
rotateExpiredKeys();