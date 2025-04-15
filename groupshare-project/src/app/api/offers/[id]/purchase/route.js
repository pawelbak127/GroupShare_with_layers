import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/database/supabase-admin-client';

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
    
    // Pobierz lub utwórz profil użytkownika BEZPOŚREDNIO
    let userProfileId;
    
    // 1. Najpierw spróbuj znaleźć istniejący profil
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();
    
    if (!profileError && existingProfile) {
      console.log("Znaleziono istniejący profil:", existingProfile.id);
      userProfileId = existingProfile.id;
    } else {
      // 2. Jeśli nie ma profilu, utwórz nowy
      console.log("Tworzenie nowego profilu dla użytkownika:", user.id);
      
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
        avatar_url: user.imageUrl || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: createdProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert([newProfile])
        .select('id')
        .single();
      
      if (createError) {
        console.error('Error creating user profile:', createError);
        return NextResponse.json(
          { error: 'Failed to create user profile', details: createError },
          { status: 500 }
        );
      }
      
      console.log("Profil utworzony pomyślnie:", createdProfile.id);
      userProfileId = createdProfile.id;
    }
    
    // Sprawdź ofertę i dostępność miejsc - używaj supabaseAdmin
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('group_subs')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .single();
    
    if (offerError) {
      console.error('Error fetching offer:', offerError);
      return NextResponse.json(
        { error: 'Offer not found', details: offerError },
        { status: 404 }
      );
    }
    
    if (!offer || offer.slots_available <= 0) {
      return NextResponse.json(
        { error: 'Offer not available or no slots left' },
        { status: 400 }
      );
    }
    
    // Utwórz rekord zakupu używając supabaseAdmin, aby ominąć RLS
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchase_records')
      .insert({
        user_id: userProfileId,
        group_sub_id: id,
        status: 'pending_payment'
      })
      .select()
      .single();
      
    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError);
      return NextResponse.json(
        { error: 'Failed to create purchase record', details: purchaseError },
        { status: 500 }
      );
    }
    
    // Zaloguj operację w security_logs
    await supabaseAdmin
      .from('security_logs')
      .insert({
        user_id: userProfileId,
        action_type: 'purchase_initiated',
        resource_type: 'group_sub',
        resource_id: id,
        status: 'success',
        details: {
          purchase_id: purchase.id,
          timestamp: new Date().toISOString()
        }
      });
    
    console.log("Zakup zainicjowany pomyślnie:", purchase.id);
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error('Error initiating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to initiate purchase', details: error.message },
      { status: 500 }
    );
  }
}