import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabase from '../../../../../lib/supabase-client';

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
    
    // Pobierz lub utwórz profil użytkownika poprzez dedykowane API
    let userProfileId;
    try {
      // Wykorzystanie istniejącego endpointu, który ma odpowiednie uprawnienia
      const profileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/profile`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Wykorzystujemy bieżącą sesję - system Clerk zapewni autentykację
          }
        }
      );
      
      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch user profile: ${profileResponse.status}`);
      }
      
      const userProfile = await profileResponse.json();
      userProfileId = userProfile.id;
      
    } catch (error) {
      console.error('Error fetching or creating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to process user profile' },
        { status: 500 }
      );
    }
    
    // Sprawdź ofertę i dostępność miejsc
    const { data: offer, error: offerError } = await supabase
      .from('group_subs')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();
    
    if (offerError || !offer || offer.slots_available <= 0) {
      return NextResponse.json(
        { error: 'Offer not available or no slots left' },
        { status: 400 }
      );
    }
    
    // Utwórz rekord zakupu
    const { data: purchase, error } = await supabase
      .from('purchase_records')
      .insert({
        user_id: userProfileId,
        group_sub_id: id,
        status: 'pending_payment'
      })
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error('Error initiating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to initiate purchase' },
      { status: 500 }
    );
  }
}