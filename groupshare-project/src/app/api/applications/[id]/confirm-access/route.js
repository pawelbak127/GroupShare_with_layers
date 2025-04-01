import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import supabase from '@/lib/supabase-client';

/**
 * GET /api/applications
 * Pobiera aplikacje użytkownika
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
    
    // Parsuj parametry zapytania
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const active = searchParams.get('active') === 'true';
    
    // Pobierz aplikacje użytkownika
    let query = supabase
      .from('applications')
      .select(`
        *,
        group_sub:group_subs(
          id, 
          price_per_slot,
          currency,
          instant_access,
          subscription_platforms(id, name, icon),
          groups(id, name)
        ),
        seller:group_subs(
          groups(
            owner_id, 
            user_profiles!inner(id, display_name, avatar_url)
          )
        )
      `)
      .eq('user_id', user.id);
    
    // Filtruj po statusie, jeśli podano
    if (status) {
      query = query.eq('status', status);
    }
    
    // Filtruj tylko aktywne (nie zakończone) aplikacje
    if (active) {
      query = query.not('status', 'in', '("completed","rejected","cancelled")');
    }
    
    // Sortuj od najnowszych
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in applications API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications
 * Tworzy nową aplikację
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
    
    // Pobierz dane żądania
    const body = await request.json();
    const { groupSubId, message } = body;
    
    if (!groupSubId) {
      return NextResponse.json(
        { error: 'Group subscription ID is required' },
        { status: 400 }
      );
    }
    
    // Sprawdź, czy oferta istnieje i jest aktywna
    const { data: offer, error: offerError } = await supabase
      .from('group_subs')
      .select('id, status, slots_available')
      .eq('id', groupSubId)
      .eq('status', 'active')
      .single();
    
    if (offerError) {
      return NextResponse.json(
        { error: 'Subscription offer not found or not active' },
        { status: 404 }
      );
    }
    
    // Sprawdź dostępność miejsc
    if (offer.slots_available <= 0) {
      return NextResponse.json(
        { error: 'No available slots in this subscription offer' },
        { status: 400 }
      );
    }
    
    // Sprawdź, czy użytkownik już nie złożył aplikacji do tej oferty
    const { data: existingApp, error: existingAppError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('group_sub_id', groupSubId)
      .not('status', 'in', '("rejected","cancelled")');
    
    if (!existingAppError && existingApp && existingApp.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active application for this offer' },
        { status: 400 }
      );
    }
    
    // Utwórz nową aplikację
    const { data: application, error: createError } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        group_sub_id: groupSubId,
        message: message || '',
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
    
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Error in create application API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}