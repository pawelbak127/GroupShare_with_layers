// src/app/api/offers/[id]/purchase/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { UseCaseFactory } from '@/application/factories/UseCaseFactory';
import { PurchaseSubscriptionSlotRequestDTO } from '@/application/use-cases/subscription/PurchaseSubscriptionSlotUseCase';
import { ApplicationException, ValidationException } from '@/application/exceptions';

/**
 * POST /api/offers/[id]/purchase
 * Inicjuje zakup subskrypcji z natychmiastowym dostępem
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    
    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log("Przetwarzanie zakupu dla użytkownika:", user.id);
    
    // Przygotuj DTO żądania
    const requestDTO = new PurchaseSubscriptionSlotRequestDTO();
    requestDTO.subscriptionId = id;
    
    // Pobierz body jeśli istnieje
    const body = await request.json().catch(() => ({}));
    
    // Wybierz metodę płatności
    requestDTO.paymentMethod = body.paymentMethod || 'blik';
    
    // Pobierz repozytorium użytkowników
    const userRepository = UseCaseFactory.getUserRepository();
    
    // Znajdź lub utwórz profil użytkownika
    let userProfile = await userRepository.findByExternalAuthId(user.id);
    
    if (!userProfile) {
      // Użyj przypadku użycia do utworzenia profilu
      const createUserUseCase = UseCaseFactory.getCreateUserUseCase();
      const createUserDTO = {
        externalAuthId: user.id,
        displayName: user.firstName 
          ? `${user.firstName} ${user.lastName || ''}`.trim() 
          : (user.username || 'Nowy użytkownik'),
        email: user.emailAddresses[0]?.emailAddress || '',
        profileType: 'both'
      };
      
      const result = await createUserUseCase.execute(createUserDTO);
      userProfile = await userRepository.findById(result.id);
    }
    
    // Ustaw użytkownika w DTO
    requestDTO.userId = userProfile.id;
    
    // Pobierz przypadek użycia
    const purchaseUseCase = UseCaseFactory.getPurchaseSubscriptionSlotUseCase();
    
    // Wykonaj przypadek użycia
    const response = await purchaseUseCase.execute(requestDTO);
    
    // Zwróć odpowiedź
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error initiating purchase:', error);
    
    // Obsługa błędów aplikacyjnych
    if (error instanceof ApplicationException) {
      // Specjalna obsługa błędów walidacji
      if (error instanceof ValidationException) {
        return NextResponse.json(
          { error: error.message, details: error.errors },
          { status: 400 }
        );
      }
      
      // Mapowanie kodów błędów na kody HTTP
      const httpStatusCodes = {
        'VALIDATION_ERROR': 400,
        'AUTHORIZATION_ERROR': 403,
        'RESOURCE_NOT_FOUND': 404,
        'BUSINESS_RULE_VIOLATION': 400,
        'PAYMENT_ERROR': 400,
        'ACCESS_DENIED': 403,
        'TOKEN_ERROR': 401,
        'ENCRYPTION_ERROR': 500,
        'SERVICE_UNAVAILABLE': 503
      };
      
      const statusCode = httpStatusCodes[error.code] || 500;
      
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusCode }
      );
    }
    
    // Ogólna obsługa błędów
    return NextResponse.json(
      { error: 'Failed to initiate purchase', details: error.message },
      { status: 500 }
    );
  }
}