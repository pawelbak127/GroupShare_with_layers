import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
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
    const { id } = params; // ID aplikacji
    
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
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    const kms = new KeyManagementService(masterKey);
    const encryptionService = new InstructionEncryptionService(kms);
    const tokenService = new TokenService();
    const securityLogger = new SecurityLogger(user.id);
    const fingerprinter = new DeviceFingerprinter();
    const anomalyDetector = new AnomalyDetector();

    // Weryfikuj token
    const isValidToken = await tokenService.verifyToken(token, id);
    if (!isValidToken) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'application',
        id,
        'failure',
        { reason: 'Invalid or expired token' }
      );

      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Pobierz informacje o aplikacji
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        user_id,
        group_sub_id,
        group_sub:group_subs(
          instant_access
        )
      `)
      .eq('id', id)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik ma prawo dostępu
    if (application.user_id !== user.id) {
      await securityLogger.logSecurityEvent(
        'instruction_access',
        'application',
        id,
        'failure',
        { reason: 'User not authorized for this application' }
      );

      return NextResponse.json(
        { error: 'You do not have permission to access these instructions' },
        { status: 403 }
      );
    }

    // Sprawdź, czy oferta ma włączony natychmiastowy dostęp
    if (!application.group_sub.instant_access) {
      return NextResponse.json(
        { error: 'This offer does not have instant access enabled' },
        { status: 400 }
      );
    }

    // Generuj odcisk urządzenia
    const deviceFingerprint = fingerprinter.generateFingerprint(request);

    // Sprawdź anomalie
    const hasAnomalies = await anomalyDetector.detectSuspiciousActivity(
      user.id,
      'instruction_access',
      {
        ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
        device_fingerprint: deviceFingerprint
      }
    );

    if (hasAnomalies) {
      // Zaloguj anomalię, ale nie blokuj dostępu - możemy dodać dodatkowe uwierzytelnianie
      await securityLogger.logSecurityEvent(
        'anomaly_detected',
        'user',
        user.id,
        'warning',
        { applicationId: id }
      );
    }

    // Zapisz odcisk urządzenia
    await fingerprinter.storeDeviceFingerprint(user.id, deviceFingerprint);

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
      .eq('group_sub_id', application.group_sub_id)
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
      'application',
      id,
      'success'
    );

    // Aktualizuj status aplikacji
    await supabase
      .from('applications')
      .update({
        access_provided: true
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