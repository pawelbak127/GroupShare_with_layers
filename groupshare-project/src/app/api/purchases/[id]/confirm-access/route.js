import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/database/supabase-admin-client';

/**
 * POST /api/purchases/[id]/confirm-access
 * Potwierdza, że kupujący otrzymał działający dostęp
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { isWorking } = await request.json();
    
    if (typeof isWorking !== 'boolean') {
      return NextResponse.json(
        { error: 'isWorking field must be a boolean value' },
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
    
    console.log(`Processing access confirmation for purchase ${id}, user: ${user.id}, isWorking: ${isWorking}`);
    
    // Pobierz profil użytkownika bezpośrednio z supabaseAdmin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found', details: profileError },
        { status: 404 }
      );
    }
    
    const userProfileId = userProfile.id;
    console.log(`Found user profile: ${userProfileId}`);
    
    // Pobierz informacje o zakupie
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchase_records')
      .select(`
        id,
        user_id,
        group_sub_id,
        group_sub:group_subs(
          group_id,
          groups(owner_id)
        ),
        status,
        access_provided
      `)
      .eq('id', id)
      .single();
    
    if (purchaseError || !purchase) {
      console.error('Error fetching purchase record:', purchaseError);
      return NextResponse.json(
        { error: 'Purchase record not found', details: purchaseError },
        { status: 404 }
      );
    }
    
    // Sprawdź, czy użytkownik ma prawo potwierdzać dostęp
    if (purchase.user_id !== userProfileId) {
      console.warn(`User ${userProfileId} attempted to confirm access for purchase ${id} belonging to user ${purchase.user_id}`);
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
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('purchase_records')
      .update({
        access_confirmed: true,
        access_confirmed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (updateError) {
      console.error('Error confirming access:', updateError);
      return NextResponse.json(
        { error: 'Failed to confirm access', details: updateError },
        { status: 500 }
      );
    }
    
    console.log(`Access confirmation updated for purchase ${id}`);
    
    // Jeśli dostęp nie działa, utwórz spór
    if (!isWorking) {
      // Pobierz powiązaną transakcję
      const { data: transactionData, error: transactionError } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('purchase_record_id', id)
        .single();
      
      if (transactionError) {
        console.error('Error fetching transaction:', transactionError);
        // Kontynuujemy mimo błędu, główna funkcjonalność została wykonana
      }
      
      const transactionId = transactionData?.id;
      const groupSubId = purchase.group_sub_id;
      const sellerId = purchase.group_sub?.groups?.owner_id;
      
      console.log(`Creating dispute for purchase ${id}, transaction ${transactionId}`);
      
      try {
        // Utwórz spór
        const { data: dispute, error: disputeError } = await supabaseAdmin
          .from('disputes')
          .insert({
            reporter_id: userProfileId,
            reported_entity_type: 'subscription',
            reported_entity_id: groupSubId,
            transaction_id: transactionId,
            dispute_type: 'access',
            description: 'Automatyczne zgłoszenie: problem z dostępem do subskrypcji',
            status: 'open',
            evidence_required: true,
            resolution_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dni
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (disputeError) {
          console.error('Error creating dispute:', disputeError);
          return NextResponse.json({
            message: 'Access confirmation successful, but failed to create dispute record',
            confirmed: true,
            disputeCreated: false,
            details: disputeError
          });
        }
        
        console.log(`Created dispute ${dispute.id}`);
        
        // Powiadom kupującego
        await createNotification(
          userProfileId,
          'dispute_created',
          'Zgłoszenie problemu z dostępem',
          'Twoje zgłoszenie zostało zarejestrowane. Skontaktujemy się z Tobą wkrótce.',
          'dispute',
          dispute.id
        );
        
        // Powiadom sprzedającego
        if (sellerId) {
          await createNotification(
            sellerId,
            'dispute_filed',
            'Zgłoszono problem z dostępem',
            'Kupujący zgłosił problem z dostępem do Twojej subskrypcji. Prosimy o pilną weryfikację.',
            'dispute',
            dispute.id
          );
        }
        
        return NextResponse.json({
          message: 'Access confirmation and dispute filed successfully',
          disputeId: dispute.id,
          confirmed: true,
          disputeCreated: true
        });
      } catch (error) {
        console.error('Error in dispute creation process:', error);
        return NextResponse.json({
          message: 'Access confirmation successful, but dispute creation failed',
          confirmed: true,
          disputeCreated: false,
          error: error.message
        });
      }
    }
    
    // Jeśli dostęp działa poprawnie
    await logSecurityEvent(userProfileId, 'access_confirmation', 'purchase_record', id, 'success', {
      isWorking: isWorking
    });
    
    return NextResponse.json({
      message: 'Access confirmed successfully',
      confirmed: true
    });
  } catch (error) {
    console.error('Error confirming access:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm access' },
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
    // Używamy supabaseAdmin, aby ominąć RLS
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: type,
        title: title,
        content: content,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        created_at: new Date().toISOString(),
        is_read: false
      });
    
    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (error) {
    console.error('Exception when creating notification:', error);
  }
}

// Funkcja do logowania zdarzeń bezpieczeństwa
async function logSecurityEvent(userId, actionType, resourceType, resourceId, status, details = {}) {
  try {
    const { error } = await supabaseAdmin
      .from('security_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: String(resourceId),
        status: status,
        details: details,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging security event:', error);
    }
  } catch (error) {
    console.error('Exception logging security event:', error);
  }
}