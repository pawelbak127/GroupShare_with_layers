import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import supabase from '@/lib/supabase-client';

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
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();
    
    // Sprawdź ofertę i dostępność miejsc
    const { data: offer } = await supabase
      .from('group_subs')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();
    
    if (!offer || offer.slots_available <= 0) {
      return NextResponse.json(
        { error: 'Offer not available or no slots left' },
        { status: 400 }
      );
    }
    
    // Utwórz rekord zakupu
    const { data: purchase, error } = await supabase
      .from('purchase_records')
      .insert({
        user_id: userProfile.id,
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