import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import supabase from '@/lib/supabase-client';

/**
 * GET /api/applications/[id]
 * Pobiera szczegóły aplikacji
 */
export async function GET(request, { params }) {
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
    
    // Pobierz aplikację ze szczegółami
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        group_sub:group_subs(
          id, 
          price_per_slot,
          currency,
          instant_access,
          subscription_platforms(id, name, icon, requirements_text, requirements_icon),
          groups(id, name, description, owner_id)
        ),
        buyer:user_profiles!user_id(id, display_name, avatar_url, verification_level, rating_avg, rating_count),
        seller:group_subs(
          groups(
            owner_id, 
            user_profiles!inner(id, display_name, avatar_url, verification_level, rating_avg, rating_count)
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (appError) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Sprawdź, czy użytkownik ma prawo dostępu (jako kupujący lub sprzedający)
    const isApplicant = application.user_id === user.id;
    const isOwner = application.group_sub.groups.owner_id === user.id;
    
    if (!isApplicant && !isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to view this application' },
        { status: 403 }
      );
    }
    
    // Pobierz tokeny dostępu, jeśli użytkownik jest właścicielem
    let accessTokens = null;
    if (isOwner) {
      const { data: tokens, error: tokensError } = await supabase
        .from('access_tokens')
        .select('id, created_at, expires_at, used, used_at')
        .eq('application_id', id)
        .order('created_at', { ascending: false });
      
      if (!tokensError) {
        accessTokens = tokens;
      }
    }
    
    return NextResponse.json({
      ...application,
      userRole: isApplicant ? 'applicant' : 'owner',
      accessTokens: accessTokens
    });
  } catch (error) {
    console.error('Error in application details API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/applications/[id]
 * Aktualizuje status aplikacji
 */
export async function PATCH(request, { params }) {
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
    
    // Pobierz dane żądania
    const body = await request.json();
    const { status } = body;
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Pobierz aplikację, aby sprawdzić uprawnienia
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id, 
        user_id, 
        status, 
        group_sub_id,
        group_sub:group_subs(
          groups(owner_id)
        )
      `)
      .eq('id', id)
      .single();
    
    if (appError) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Sprawdź, czy użytkownik ma prawo do aktualizacji
    const isApplicant = application.user_id === user.id;
    const isOwner = application.group_sub.groups.owner_id === user.id;
    
    // Walidacja uprawnień w zależności od żądanej zmiany statusu
    if (status === 'cancelled' && !isApplicant) {
      return NextResponse.json(
        { error: 'Only the applicant can cancel an application' },
        { status: 403 }
      );
    }
    
    if ((status === 'accepted' || status === 'rejected') && !isOwner) {
      return NextResponse.json(
        { error: 'Only the owner can accept or reject an application' },
        { status: 403 }
      );
    }
    
    // Walidacja dozwolonych przejść statusów
    const allowedTransitions = {
      'pending': ['accepted', 'rejected', 'cancelled'],
      'accepted': ['completed', 'problem', 'cancelled'],
      'rejected': [],
      'completed': [],
      'problem': ['completed', 'cancelled'],
      'cancelled': []
    };
    
    if (!allowedTransitions[application.status].includes(status)) {
      return NextResponse.json(
        { error: `Cannot change status from '${application.status}' to '${status}'` },
        { status: 400 }
      );
    }
    
    // Aktualizuj status aplikacji
    const updates = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // Jeśli status to "accepted", zaktualizuj access_provided
    if (status === 'accepted') {
      updates.access_provided = true;
    }
    
    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating application:', updateError);
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      );
    }
    
    // Jeśli aplikacja została zaakceptowana, zaktualizuj liczbę dostępnych miejsc
    if (status === 'accepted') {
      const { error: subUpdateError } = await supabase
        .from('group_subs')
        .update({
          slots_available: supabase.rpc('decrement', { x: 1 })
        })
        .eq('id', application.group_sub_id);
      
      if (subUpdateError) {
        console.error('Error updating subscription slots:', subUpdateError);
      }
    }
    
    // Jeśli aplikacja została anulowana, a wcześniej była zaakceptowana, zwiększ liczbę dostępnych miejsc
    if (status === 'cancelled' && application.status === 'accepted') {
      const { error: subUpdateError } = await supabase
        .from('group_subs')
        .update({
          slots_available: supabase.rpc('increment', { x: 1 })
        })
        .eq('id', application.group_sub_id);
      
      if (subUpdateError) {
        console.error('Error updating subscription slots:', subUpdateError);
      }
    }
    
    return NextResponse.json(updatedApp);
  } catch (error) {
    console.error('Error in update application API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}