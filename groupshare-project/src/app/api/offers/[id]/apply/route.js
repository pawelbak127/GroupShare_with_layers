import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import supabase from '@/lib/supabase-client';

/**
 * POST /api/offers/[id]/apply
 * Aplikuj o dostęp do oferty subskrypcji
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
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

    // Pobierz profil użytkownika z Supabase
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();

    if (profileError || !userProfile) {
      // Jeśli profil nie istnieje, pobierz dane z API profilu, które go utworzy
      const profileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/profile`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
          }
        }
      );

      if (!profileResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to get or create user profile' },
          { status: 500 }
        );
      }

      const userProfileData = await profileResponse.json();
      userProfile = { id: userProfileData.id };
    }

    // Parsuj dane żądania
    const body = await request.json();
    const message = body.message || '';

    // Pobierz informacje o ofercie subskrypcji
    const { data: offer, error: offerError } = await supabase
      .from('group_subs')
      .select('*')
      .eq('id', id)
      .single();

    if (offerError) {
      return NextResponse.json(
        { error: 'Subscription offer not found' },
        { status: 404 }
      );
    }

    // Sprawdź, czy oferta jest aktywna i ma dostępne miejsca
    if (offer.status !== 'active') {
      return NextResponse.json(
        { error: 'This subscription offer is no longer active' },
        { status: 400 }
      );
    }

    if (offer.slots_available <= 0) {
      return NextResponse.json(
        { error: 'This subscription offer has no available slots' },
        { status: 400 }
      );
    }

    // Sprawdź, czy użytkownik już ma aktywną aplikację dla tej oferty
    const { data: existingApplications, error: existingAppError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('user_id', userProfile.id)
      .eq('group_sub_id', id)
      .not('status', 'in', '("rejected","cancelled")');

    if (!existingAppError && existingApplications && existingApplications.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active application for this offer' },
        { status: 400 }
      );
    }

    // Utwórz nową aplikację
    const { data: application, error: createError } = await supabase
      .from('applications')
      .insert({
        user_id: userProfile.id,
        group_sub_id: id,
        message,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating application:', createError);
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      );
    }

    // Log event for auditing
    await supabase
      .from('security_logs')
      .insert({
        user_id: userProfile.id,
        action_type: 'application_created',
        resource_type: 'group_sub',
        resource_id: id,
        status: 'success',
        details: { application_id: application.id }
      });

    return NextResponse.json(
      { 
        message: 'Application submitted successfully',
        application 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error applying for offer:', error);
    return NextResponse.json(
      { error: 'Failed to apply for subscription offer' },
      { status: 500 }
    );
  }
}