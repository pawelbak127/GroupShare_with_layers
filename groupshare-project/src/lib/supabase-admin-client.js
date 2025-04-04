import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY'
  );
}

console.log("Inicjalizacja supabaseAdmin z kluczem serwisowym");

// Klient z uprawnieniami administratora, używany TYLKO na serwerze
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default supabaseAdmin;