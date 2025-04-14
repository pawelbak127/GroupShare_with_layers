import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/supabase-admin-client';
import crypto from 'crypto';

/**
 * POST /api/access-instructions
 * Zapisuje zaszyfrowane instrukcje dostępowe dla oferty subskrypcji
 */
export async function POST(request) {
  try {
    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parsuj dane żądania
    const body = await request.json();
    const { groupSubId, instructions } = body;

    if (!groupSubId || !instructions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Pobierz profil użytkownika
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();
      
    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found', details: profileError },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik ma uprawnienia do tej oferty
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('group_subs')
      .select(`
        groups!inner(owner_id)
      `)
      .eq('id', groupSubId)
      .single();

    if (offerError || !offer) {
      console.error('Error fetching offer for access instructions:', offerError);
      return NextResponse.json(
        { error: 'Subscription offer not found', details: offerError },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik jest właścicielem grupy
    if (offer.groups.owner_id !== userProfile.id) {
      // Sprawdź, czy użytkownik jest administratorem grupy
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('group_members')
        .select('role')
        .eq('group_id', offer.groups.id)
        .eq('user_id', userProfile.id)
        .eq('status', 'active')
        .single();
        
      if (membershipError || !membership || membership.role !== 'admin') {
        await logSecurityEvent(userProfile.id, 'instruction_save_attempt', 'group_sub', groupSubId, 'failure', {
          reason: 'Not owner or admin'
        });
        
        return NextResponse.json(
          { error: 'You do not have permission to add instructions to this offer' },
          { status: 403 }
        );
      }
    }

    // Pobierz lub wygeneruj klucz szyfrowania
    let encryptionKeyId;
    const { data: existingKey, error: keyError } = await supabaseAdmin
      .from('encryption_keys')
      .select('id')
      .eq('key_type', 'group')
      .eq('related_id', groupSubId)
      .eq('active', true)
      .single();

    if (!keyError && existingKey) {
      encryptionKeyId = existingKey.id;
    } else {
      // Generuj nowy klucz
      const newKey = {
        key_type: 'group',
        public_key: 'dummy_public_key_' + Math.random().toString(36).substring(2),
        private_key_enc: 'dummy_encrypted_private_key_' + Math.random().toString(36).substring(2),
        related_id: groupSubId,
        active: true,
        created_at: new Date().toISOString()
      };
      
      const { data: createdKey, error: createKeyError } = await supabaseAdmin
        .from('encryption_keys')
        .insert([newKey])
        .select('id')
        .single();
        
      if (createKeyError || !createdKey) {
        console.error('Error creating encryption key:', createKeyError);
        
        await logSecurityEvent(userProfile.id, 'instruction_save', 'group_sub', groupSubId, 'failure', {
          reason: 'Failed to create encryption key',
          error: createKeyError?.message
        });
        
        return NextResponse.json(
          { error: 'Failed to create encryption key', details: createKeyError },
          { status: 500 }
        );
      }
      
      encryptionKeyId = createdKey.id;
    }

    // "Szyfrowanie" instrukcji (uproszczone dla demonstracji)
    // W produkcji użyj odpowiednich algorytmów kryptograficznych
    const encryptedData = 'ENCRYPTED:' + Buffer.from(instructions).toString('base64');
    const iv = crypto.randomBytes(16).toString('hex');
    const dataKeyEnc = 'dummy_key_enc_' + Math.random().toString(36).substring(2);

    // Zapisz zaszyfrowane instrukcje
    const { data: savedData, error: saveError } = await supabaseAdmin
      .from('access_instructions')
      .upsert({
        group_sub_id: groupSubId,
        encrypted_data: encryptedData,
        data_key_enc: dataKeyEnc,
        encryption_key_id: encryptionKeyId,
        encryption_version: '1.0',
        iv: iv,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'group_sub_id'
      })
      .select();

    if (saveError) {
      console.error('Error saving encrypted instructions:', saveError);
      
      await logSecurityEvent(userProfile.id, 'instruction_save', 'group_sub', groupSubId, 'failure', {
        reason: 'Database error',
        error: saveError?.message
      });
      
      return NextResponse.json(
        { error: 'Failed to save encrypted instructions', details: saveError },
        { status: 500 }
      );
    }
    
    // Zaloguj operację
    await logSecurityEvent(userProfile.id, 'instruction_save', 'group_sub', groupSubId, 'success', {
      instruction_id: savedData?.[0]?.id
    });

    return NextResponse.json({
      message: 'Instructions encrypted and saved successfully',
      instructionId: savedData?.[0]?.id
    });
  } catch (error) {
    console.error('Error encrypting instructions:', error);
    return NextResponse.json(
      { error: 'Failed to process instructions', details: error.message },
      { status: 500 }
    );
  }
}

// Funkcja do logowania zdarzeń bezpieczeństwa
async function logSecurityEvent(userId, actionType, resourceType, resourceId, status, details = {}) {
  try {
    const { error } = await supabaseAdmin
      .from('security_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: String(resourceId),
        status: status,
        details: details,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging security event:', error);
    }
  } catch (error) {
    console.error('Exception logging security event:', error);
  }
}