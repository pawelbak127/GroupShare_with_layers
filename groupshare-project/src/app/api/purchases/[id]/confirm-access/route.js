import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import supabase from '@/lib/supabase-client';

/**
 * POST /api/purchases/[id]/confirm-access
 * Potwierdza, że kupujący otrzymał działający dostęp
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { isWorking } = await request.json();
    
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
    
    // Pobierz informacje o zakupie
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_records')
      .select(`
        id,
        user_id,
        group_sub_id,
        group_sub:group_subs(
          groups(owner_id)
        ),
        status,
        access_provided
      `)
      .eq('id', id)
      .single();
    
    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Purchase record not found' },
        { status: 404 }
      );
    }
    
    // Sprawdź, czy użytkownik ma prawo potwierdzać dostęp
    if (purchase.user_id !== userProfile.id) {
      return NextResponse.json(
        { error: 'You can only confirm your own purchases' },
        { status: 403 }
      );
    }
    
    // Sprawdź, czy dostęp został wcześniej udostępniony
    if (!purchase.access_provided) {
      return NextResponse.json(
        { error: 'Access has not been provided yet' },
        { status: 400 }
      );
    }
    
    // Aktualizuj status potwierdzenia
    await supabase
      .from('purchase_records')
      .update({
        access_confirmed: true,
        access_confirmed_at: new Date().toISOString()
      })
      .eq('id', id);
    
    // Jeśli dostęp nie działa, utwórz spór
    if (!isWorking) {
      const { data: dispute } = await supabase
        .from('disputes')
        .insert({
          reporter_id: userProfile.id,
          reported_entity_type: 'subscription',
          reported_entity_id: purchase.group_sub_id,
          transaction_id: (await supabase
            .from('transactions')
            .select('id')
            .eq('purchase_record_id', id)
            .single()).data.id,
          dispute_type: 'access',
          description: 'Automatyczne zgłoszenie: problem z dostępem do subskrypcji',
          status: 'open',
          evidence_required: true,
          resolution_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 dni
        })
        .select()
        .single();
      
      // Powiadom kupującego
      await createNotification(
        userProfile.id,
        'dispute_created',
        'Zgłoszenie problemu z dostępem',
        'Twoje zgłoszenie zostało zarejestrowane. Skontaktujemy się z Tobą wkrótce.',
        'dispute',
        dispute.id
      );
      
      // Powiadom sprzedającego
      await createNotification(
        purchase.group_sub.groups.owner_id,
        'dispute_filed',
        'Zgłoszono problem z dostępem',
        'Kupujący zgłosił problem z dostępem do Twojej subskrypcji. Prosimy o pilną weryfikację.',
        'dispute',
        dispute.id
      );
      
      return NextResponse.json({
        message: 'Access confirmation and dispute filed successfully',
        disputeId: dispute.id
      });
    }
    
    // Jeśli dostęp działa poprawnie
    return NextResponse.json({
      message: 'Access confirmed successfully'
    });
  } catch (error) {
    console.error('Error confirming access:', error);
    return NextResponse.json(
      { error: 'Failed to confirm access' },
      { status: 500 }
    );
  }
}

// Pomocnicza funkcja do tworzenia powiadomień
async function createNotification(
  userId,
  type,
  title,
  content,
  relatedEntityType,
  relatedEntityId
) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: type,
      title: title,
      content: content,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}