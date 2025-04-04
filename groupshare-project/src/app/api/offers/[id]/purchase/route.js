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
    
    // Pobierz profil użytkownika
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();
    
    // Sprawdź czy profil istnieje
    if (profileError || !userProfile) {
      console.error('User profile not found, creating one...');
      
      // Utwórz profil użytkownika, jeśli nie istnieje
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
      
      const { data: createdProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single();
      
      if (createError || !createdProfile) {
        console.error('Error creating user profile:', createError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }
      
      // Użyj nowo utworzonego profilu
      var userProfileId = createdProfile.id;
    } else {
      var userProfileId = userProfile.id;
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