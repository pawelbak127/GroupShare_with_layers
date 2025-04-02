import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { getUserByAuthId, createUserProfile } from '@/lib/supabase-client';

/**
 * GET /api/auth/profile
 * Pobiera profil obecnie zalogowanego użytkownika, lub tworzy go jeśli nie istnieje
 */
export async function GET() {
  try {
    // Pobierz dane zalogowanego użytkownika z Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Sprawdź, czy użytkownik ma profil w bazie danych
    const userProfile = await getUserByAuthId(user.id);
    
    // Jeśli profil istnieje, zwróć go
    if (userProfile) {
      return NextResponse.json(userProfile);
    }
    
    // W przeciwnym razie utwórz nowy profil
    const newProfile = {
      external_auth_id: user.id,
      display_name: user.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim() 
        : (user.username || 'Nowy użytkownik'),
      email: user.emailAddresses[0]?.emailAddress || '',
      phone_number: user.phoneNumbers[0]?.phoneNumber || null,
      profile_type: 'both', // Domyślna wartość
      verification_level: 'basic', // Domyślna wartość
      bio: '',
      avatar_url: user.imageUrl || null
    };
    
    const createdProfile = await createUserProfile(newProfile);
    
    if (!createdProfile) {
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(createdProfile);
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/profile
 * Aktualizuje profil zalogowanego użytkownika
 */
export async function PATCH(request) {
  try {
    // Pobierz dane zalogowanego użytkownika z Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Pobierz dane z żądania
    const updates = await request.json();
    
    // Zablokuj modyfikację pól, których użytkownik nie powinien móc zmienić
    const forbiddenFields = ['id', 'external_auth_id', 'email', 'verification_level', 'rating_avg', 'rating_count', 'created_at'];
    
    for (const field of forbiddenFields) {
      if (field in updates) {
        delete updates[field];
      }
    }
    
    // Sprawdź, czy użytkownik ma profil w bazie danych
    const userProfile = await getUserByAuthId(user.id);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Aktualizuj profil
    const updated = await updateUserProfile(userProfile.id, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}