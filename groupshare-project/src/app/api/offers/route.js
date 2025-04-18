// /src/app/api/offers/route.js

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { UseCaseFactory } from '@/application/factories/UseCaseFactory';
import { 
  ListAvailableSubscriptionsRequestDTO,
  CreateSubscriptionRequestDTO
} from '@/application/use-cases/subscription';
import { ErrorHandler } from '@/application/utils/ErrorHandler';

/**
 * GET /api/offers
 * Pobiera oferty subskrypcji z opcjonalnym filtrowaniem
 */
export async function GET(request) {
  try {
    console.log('GET /api/offers - Request received');
    
    // Parsuj parametry zapytania
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    // Przygotuj DTO żądania
    const requestDTO = new ListAvailableSubscriptionsRequestDTO();
    requestDTO.platformId = searchParams.get('platformId') || null;
    requestDTO.minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : null;
    requestDTO.maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : null;
    requestDTO.availableSlots = searchParams.get('availableSlots') !== 'false'; // Domyślnie true
    requestDTO.orderBy = searchParams.get('orderBy') || 'created_at';
    requestDTO.ascending = searchParams.get('ascending') === 'true';
    requestDTO.page = searchParams.get('page') ? parseInt(searchParams.get('page')) : 1;
    requestDTO.limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 20;
    
    // Pobierz przypadek użycia
    const listSubscriptionsUseCase = UseCaseFactory.getListAvailableSubscriptionsUseCase();
    
    // Wykonaj przypadek użycia
    const response = await listSubscriptionsUseCase.execute(requestDTO);
    
    // Transformuj odpowiedź do oczekiwanego formatu API
    const offers = response.items.map(subscription => ({
      id: subscription.id,
      group_id: subscription.groupId,
      group_name: subscription.groupName,
      platform_id: subscription.platformId,
      platform_name: subscription.platformName,
      platform_icon: subscription.platformIcon,
      status: subscription.status,
      slots_total: subscription.slotsTotal,
      slots_available: subscription.slotsAvailable,
      price_per_slot: subscription.pricePerSlot,
      currency: subscription.currency,
      owner: subscription.owner,
      created_at: subscription.createdAt
    }));
    
    return NextResponse.json(offers);
  } catch (error) {
    console.error('Unexpected error in /api/offers:', error);
    
    // Obsłuż błąd
    const errorResponse = ErrorHandler.handleError(error);
    return NextResponse.json(
      { error: errorResponse.error, details: errorResponse.details },
      { status: errorResponse.status }
    );
  }
}

/**
 * POST /api/offers
 * Tworzy nową ofertę subskrypcji
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
    
    // Pobierz dane z żądania
    const body = await request.json();
    
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
    const requestDTO = new CreateSubscriptionRequestDTO();
    requestDTO.groupId = body.groupId;
    requestDTO.platformId = body.platformId;
    requestDTO.slotsTotal = body.slotsTotal;
    requestDTO.pricePerSlot = body.pricePerSlot;
    requestDTO.currency = body.currency || 'PLN';
    requestDTO.accessInstructions = body.accessInstructions;
    requestDTO.userId = userProfile.id;
    
    // Pobierz przypadek użycia
    const createSubscriptionUseCase = UseCaseFactory.getCreateSubscriptionUseCase();
    
    // Wykonaj przypadek użycia
    const response = await createSubscriptionUseCase.execute(requestDTO);
    
    // Transformuj odpowiedź do oczekiwanego formatu API
    const offer = {
      id: response.id,
      group_id: response.groupId,
      platform_id: response.platformId,
      status: response.status,
      slots_total: response.slotsTotal,
      slots_available: response.slotsAvailable,
      price_per_slot: response.pricePerSlot,
      currency: response.currency,
      created_at: response.createdAt
    };
    
    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/offers:', error);
    
    // Obsłuż błąd
    const errorResponse = ErrorHandler.handleError(error);
    return NextResponse.json(
      { error: errorResponse.error, details: errorResponse.details },
      { status: errorResponse.status }
    );
  }
}