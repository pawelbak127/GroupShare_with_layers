import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { 
  KeyManagementService, 
  InstructionEncryptionService, 
  TokenService,
  SecurityLogger,
  DeviceFingerprinter,
  AnomalyDetector
} from '@/lib/security';
import supabase from '@/lib/supabase-client';

/**
 * GET /api/access/[id]
 * Pobiera instrukcje dostępowe za pomocą jednorazowego tokenu
 */
export async function GET(request, { params }) {
  try {
    const { id } = params; // ID zakupu
    
    // Pobierz token z URL
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Inicjalizuj serwisy
    const tokenService = new TokenService();
    const keyManagementService = new KeyManagementService(process.env.ENCRYPTION_MASTER_KEY);
    const encryptionService = new InstructionEncryptionService(keyManagementService);
    const securityLogger = new SecurityLogger(user.id);
    
    // Weryfikuj token
    const isValidToken = await tokenService.verifyToken(token, id);
    if (!isValidToken) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'purchase',
        id,
        'failure',
        { reason: 'Invalid or expired token' }
      );

      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Pobierz informacje o zakupie
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_records')
      .select(`
        user_id,
        group_sub_id,
        status
      `)
      .eq('id', id)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Purchase record not found' },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik ma prawo dostępu
    if (purchase.user_id !== user.id) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'purchase',
        id,
        'failure',
        { reason: 'User not authorized for this purchase' }
      );

      return NextResponse.json(
        { error: 'You do not have permission to access these instructions' },
        { status: 403 }
      );
    }

    // Sprawdź, czy płatność została zakończona
    if (purchase.status !== 'completed') {
      return NextResponse.json(
        { error: 'Purchase not completed yet' },
        { status: 400 }
      );
    }

    // Pobierz zaszyfrowane instrukcje
    const { data: encryptedInstructions, error: instructionsError } = await supabase
      .from('access_instructions')
      .select(`
        encrypted_data,
        data_key_enc,
        encryption_key_id,
        iv,
        encryption_version
      `)
      .eq('group_sub_id', purchase.group_sub_id)
      .single();

    if (instructionsError || !encryptedInstructions) {
      return NextResponse.json(
        { error: 'Access instructions not found' },
        { status: 404 }
      );
    }

    // Odszyfruj instrukcje
    const decryptedInstructions = await encryptionService.decryptInstructions({
      encryptedData: encryptedInstructions.encrypted_data,
      encryptedKey: encryptedInstructions.data_key_enc,
      keyId: encryptedInstructions.encryption_key_id,
      iv: encryptedInstructions.iv,
      version: encryptedInstructions.encryption_version
    });

    // Zaloguj udany dostęp
    await securityLogger.logSecurityEvent(
      'instruction_access',
      'purchase',
      id,
      'success'
    );

    // Aktualizuj status dostępu
    await supabase
      .from('purchase_records')
      .update({
        access_provided: true,
        access_provided_at: new Date().toISOString()
      })
      .eq('id', id);

    return NextResponse.json({
      instructions: decryptedInstructions,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Instrukcje wygasają po 5 minutach
    });
  } catch (error) {
    console.error('Error accessing instructions:', error);
    return NextResponse.json(
      { error: 'Failed to access instructions' },
      { status: 500 }
    );
  }
}