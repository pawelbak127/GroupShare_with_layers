// /src/app/api/access/[id]/route.js

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { UseCaseFactory } from '@/application/factories/UseCaseFactory';
import { ProvideAccessInstructionsRequestDTO } from '@/application/use-cases/access/ProvideAccessInstructionsUseCase';
import { ApplicationException } from '@/application/exceptions';
import { ErrorHandler } from '@/application/utils/ErrorHandler';

/**
 * GET /api/access/[id]
 * Weryfikuje token dostępu i zwraca instrukcje dostępu do subskrypcji
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    console.log(`Processing access request for purchase ${id}`);
    
    // Specjalny przypadek dla bezpośredniego dostępu z panelu aplikacji
    let directAccess = false;
    if (token === 'direct') {
      // Pomijamy weryfikację tokenu, bo dostęp jest z panelu aplikacji
      // Nadal sprawdzamy czy użytkownik ma dostęp do zakupu
      directAccess = true;
      console.log(`Direct access requested for purchase ${id}`);
    }
    
    // Sprawdź czy token jest prawidłowy
    if (!token && !directAccess) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 401 }
      );
    }
    
    // Sprawdź autentykację
    const user = await currentUser();
    let userProfileId = null;
    
    if (user) {
      // Pobierz repozytorium użytkowników
      const userRepository = UseCaseFactory.getUserRepository();
      
      // Znajdź lub utwórz profil użytkownika
      let userProfile = await userRepository.findByExternalAuthId(user.id);
      
      if (userProfile) {
        userProfileId = userProfile.id;
        console.log(`Authenticated user: ${userProfileId}`);
      }
    }
    
    // Przygotuj DTO żądania
    const requestDTO = new ProvideAccessInstructionsRequestDTO();
    requestDTO.purchaseId = id;
    requestDTO.userId = userProfileId;
    requestDTO.token = directAccess ? null : token;
    requestDTO.ipAddress = request.headers.get('x-forwarded-for') || null;
    requestDTO.userAgent = request.headers.get('user-agent') || null;
    
    // Pobierz przypadek użycia
    const provideAccessUseCase = UseCaseFactory.getProvideAccessInstructionsUseCase();
    
    // Wykonaj przypadek użycia
    const response = await provideAccessUseCase.execute(requestDTO);
    
    // Zaloguj udane pobranie instrukcji dostępu
    await logSecurityEvent(
      userProfileId || response.user?.id,
      'access_success',
      'purchase_record',
      id,
      'success',
      {
        platform: response.platform,
        token_id: directAccess ? 'direct_access' : null,
        has_instructions: response.hasInstructions
      }
    );
    
    console.log(`Access successful for purchase ${id}`);
    
    // Zwróć dane dostępowe
    return NextResponse.json({
      purchase_id: response.purchaseId,
      platform: response.platform,
      instructions: response.instructions,
      purchased_at: response.purchasedAt,
      user: response.user?.displayName,
      email: response.user?.email,
      owner_contact: response.ownerContact,
      has_instructions: response.hasInstructions,
      direct_access: directAccess
    });
  } catch (error) {
    console.error('Error processing access request:', error);
    
    // Zaloguj nieudaną próbę dostępu
    try {
      await logSecurityEvent(
        null,
        'access_attempt',
        'purchase_record',
        params?.id || 'unknown',
        'error',
        {
          error: error.message
        }
      );
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }
    
    // Obsłuż błąd
    const errorResponse = ErrorHandler.handleError(error);
    return NextResponse.json(
      { error: errorResponse.error, details: errorResponse.details },
      { status: errorResponse.status }
    );
  }
}

// Funkcja do logowania zdarzeń bezpieczeństwa
async function logSecurityEvent(userId, actionType, resourceType, resourceId, status, details = {}) {
  try {
    const securityLogRepository = UseCaseFactory.getSecurityLogRepository();
    
    await securityLogRepository.create({
      user_id: userId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: String(resourceId),
      status: status,
      details: details,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Exception logging security event:', error);
  }
}