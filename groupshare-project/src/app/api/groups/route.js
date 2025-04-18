// /src/app/api/groups/route.js

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { UseCaseFactory } from '@/application/factories/UseCaseFactory';
import { 
  CreateGroupRequestDTO, 
  ListUserGroupsRequestDTO 
} from '@/application/use-cases/group';
import { ErrorHandler } from '@/application/utils/ErrorHandler';

/**
 * GET /api/groups
 * Pobiera grupy użytkownika
 */
export async function GET(request) {
  try {
    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Fetching groups for user:', user.id);
    
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
    
    console.log('User profile ID:', userProfile.id);
    
    // Przygotuj DTO żądania
    const requestDTO = new ListUserGroupsRequestDTO();
    requestDTO.userId = userProfile.id;
    
    // Pobierz przypadek użycia
    const listGroupsUseCase = UseCaseFactory.getListUserGroupsUseCase();
    
    // Wykonaj przypadek użycia
    const response = await listGroupsUseCase.execute(requestDTO);
    
    // Transformuj odpowiedź do oczekiwanego formatu API
    const groups = response.groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      created_at: group.createdAt,
      owner_id: group.ownerId,
      isOwner: group.isOwner,
      role: group.role,
      member_count: group.memberCount,
      subscription_count: group.subscriptionCount
    }));
    
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Unexpected error in /api/groups:', error);
    
    // Obsłuż błąd
    const errorResponse = ErrorHandler.handleError(error);
    return NextResponse.json(
      { error: errorResponse.error, details: errorResponse.details },
      { status: errorResponse.status }
    );
  }
}

/**
 * POST /api/groups
 * Tworzy nową grupę
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
    const requestDTO = new CreateGroupRequestDTO();
    requestDTO.name = body.name;
    requestDTO.description = body.description;
    requestDTO.userId = userProfile.id;
    
    // Pobierz przypadek użycia
    const createGroupUseCase = UseCaseFactory.getCreateGroupUseCase();
    
    // Wykonaj przypadek użycia
    const response = await createGroupUseCase.execute(requestDTO);
    
    // Transformuj odpowiedź do oczekiwanego formatu API
    const group = {
      id: response.id,
      name: response.name,
      description: response.description,
      created_at: response.createdAt,
      owner_id: response.ownerId,
      isOwner: true,
      role: response.role
    };
    
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/groups:', error);
    
    // Obsłuż błąd
    const errorResponse = ErrorHandler.handleError(error);
    return NextResponse.json(
      { error: errorResponse.error, details: errorResponse.details },
      { status: errorResponse.status }
    );
  }
}