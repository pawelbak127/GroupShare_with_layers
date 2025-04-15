// src/app/api/payments/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { userRepository } from '@/lib/database/supabase-client';
import { paymentService } from '@/services/payment/payment-service';

/**
 * POST /api/payments
 * Przetwarza płatność za subskrypcję i automatycznie przyznaje dostęp
 * Zrefaktoryzowana wersja używająca PaymentService
 */
export async function POST(request) {
  try {
    const { purchaseId, paymentMethod } = await request.json();
    
    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Processing payment for user:', user.id);
    
    // Pobierz profil użytkownika
    let userProfile = await userRepository.getByAuthId(user.id);
    
    // Jeśli nie znaleziono profilu, utwórz nowy
    if (!userProfile) {
      console.log('User profile not found, creating new profile');
      
      // Tworzenie nowego profilu
      const newProfile = {
        external_auth_id: user.id,
        display_name: user.firstName 
          ? `${user.firstName} ${user.lastName || ''}`.trim() 
          : (user.username || 'Nowy użytkownik'),
        email: user.emailAddresses[0]?.emailAddress || '',
        phone_number: user.phoneNumbers[0]?.phoneNumber || null,
        profile_type: 'buyer',
        verification_level: 'basic',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      userProfile = await userRepository.create(newProfile);
      
      if (!userProfile) {
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }
    }
    
    try {
      // Przetwórz płatność za pomocą serwisu płatności
      const result = await paymentService.processPayment(
        purchaseId, 
        paymentMethod, 
        userProfile.id
      );
      
      // Zwróć odpowiedź w formacie kompatybilnym z dotychczasowym API
      // aby zachować zgodność z istniejącym kodem frontendu
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        purchaseId: purchaseId,
        accessUrl: result.accessUrl,
        recovered: result.recovered // dodane pole informujące o częściowym odzyskaniu
      });
    } catch (paymentError) {
      // Sprawdź, czy komunikat błędu dotyczy braku miejsc
      if (paymentError.message.includes('Brak dostępnych miejsc')) {
        return NextResponse.json(
          { 
            error: 'Przepraszamy, ale wszystkie miejsca zostały już zajęte. Odśwież stronę, aby zobaczyć aktualne oferty.',
            code: 'NO_AVAILABLE_SLOTS'
          },
          { status: 400 }
        );
      }
      
      // Inny błąd płatności
      throw paymentError;
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}