import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { 
  KeyManagementService, 
  InstructionEncryptionService,
  SecurityLogger 
} from '@/lib/security';
import supabase from '@/lib/supabase-client';

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

    // Sprawdź, czy użytkownik ma uprawnienia do tej oferty
    const { data: offer, error: offerError } = await supabase
      .from('group_subs')
      .select(`
        groups!inner(owner_id)
      `)
      .eq('id', groupSubId)
      .single();

    if (offerError) {
      return NextResponse.json(
        { error: 'Subscription offer not found' },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik jest właścicielem grupy
    if (offer.groups.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to add instructions to this offer' },
        { status: 403 }
      );
    }

    // Inicjalizacja serwisów bezpieczeństwa
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    const kms = new KeyManagementService(masterKey);
    const encryptionService = new InstructionEncryptionService(kms);
    const securityLogger = new SecurityLogger(user.id);

    // Pobierz lub wygeneruj klucz dla grupy
    let keyId;
    const { data: existingKey } = await supabase
      .from('encryption_keys')
      .select('id')
      .eq('key_type', 'group')
      .eq('related_id', groupSubId)
      .eq('active', true)
      .single();

    if (existingKey) {
      keyId = existingKey.id;
    } else {
      // Generuj nowy klucz
      keyId = await kms.generateKeyPair('group', groupSubId);
    }

    // Szyfruj instrukcje
    const encryptedData = await encryptionService.encryptInstructions(
      instructions,
      keyId
    );

    // Zapisz zaszyfrowane instrukcje
    const { data: savedData, error: saveError } = await supabase
      .from('access_instructions')
      .upsert({
        group_sub_id: groupSubId,
        encrypted_data: encryptedData.encryptedData,
        data_key_enc: encryptedData.encryptedKey,
        encryption_key_id: keyId,
        encryption_version: '1.0',
        iv: encryptedData.iv,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'group_sub_id'
      })
      .select();

    if (saveError) {
      await securityLogger.logSecurityEvent(
        'instruction_encryption',
        'group_sub',
        groupSubId,
        'failure',
        { error: saveError.message }
      );

      return NextResponse.json(
        { error: 'Failed to save encrypted instructions' },
        { status: 500 }
      );
    }

    // Zaktualizuj flagę instant_access w ofercie
    await supabase
      .from('group_subs')
      .update({ instant_access: true })
      .eq('id', groupSubId);

    // Zaloguj operację
    await securityLogger.logSecurityEvent(
      'instruction_encryption',
      'group_sub',
      groupSubId,
      'success'
    );

    return NextResponse.json({
      message: 'Instructions encrypted and saved successfully',
      instructionId: savedData[0].id
    });
  } catch (error) {
    console.error('Error encrypting instructions:', error);
    return NextResponse.json(
      { error: 'Failed to process instructions' },
      { status: 500 }
    );
  }
}