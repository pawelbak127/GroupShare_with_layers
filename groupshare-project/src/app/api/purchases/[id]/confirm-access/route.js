// src/app/api/purchases/[id]/confirm-access/route.js

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { UseCaseFactory } from '@/application/factories/UseCaseFactory';
import { ConfirmAccessRequestDTO } from '@/application/use-cases/access/ConfirmAccessUseCase';
import { ApplicationException } from '@/application/exceptions';
import { handleApplicationError } from '@/middleware/errorHandlerMiddleware';

/**
 * POST /api/purchases/[id]/confirm-access
 * Potwierdza, że kupujący otrzymał działający dostęp
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { isWorking } = await request.json();
    
    if (typeof isWorking !== 'boolean') {
      return NextResponse.json(
        { error: 'isWorking field must be a boolean value' },
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
    
    console.log(`Processing access confirmation for purchase ${id}, user: ${user.id}, isWorking: ${isWorking}`);
    
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
    
    // Przygotuj DTO żądania
    const requestDTO = new ConfirmAccessRequestDTO();
    requestDTO.purchaseId = id;
    requestDTO.userId = userProfile.id;
    requestDTO.isWorking = isWorking;
    
    // Pobierz przypadek użycia
    const confirmAccessUseCase = UseCaseFactory.getConfirmAccessUseCase();
    
    // Wykonaj przypadek użycia
    const response = await confirmAccessUseCase.execute(requestDTO);
    
    // Zwróć odpowiedź
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error confirming access:', error);
    
    // Użyj handlera błędów
    const errorResponse = handleApplicationError(error);
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.status }
    );
  }
}