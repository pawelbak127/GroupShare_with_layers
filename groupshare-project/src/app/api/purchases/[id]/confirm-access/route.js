import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabase from '@/lib/supabase-client';
import supabaseAdmin from '@/lib/supabase-admin-client';

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
    
    // Pobierz profil użytkownika
    let userProfileId;
    try {
      const profileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/profile`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Clerk zapewni autentykację
          }
        }
      );
      
      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch user profile: ${profileResponse.status}`);
      }
      
      const userProfile = await profileResponse.json();
      userProfileId = userProfile.id;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: 'Failed to verify user profile' },
        { status: 500 }
      );
    }
    
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
    
    if (purchaseError) {
      if (purchaseError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Purchase record not found', code: purchaseError.code },
          { status: 404 }
        );
      } else if (purchaseError.code === '42501') {
        console.error('Permission denied when fetching purchase record:', purchaseError);
        return NextResponse.json(
          { error: 'You do not have permission to access this purchase record', code: purchaseError.code },
          { status: 403 }
        );
      } else {
        console.error('Error fetching purchase record:', purchaseError);
        return NextResponse.json(
          { error: purchaseError.message || 'Failed to fetch purchase record', code: purchaseError.code },
          { status: 500 }
        );
      }
    }
    
    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase record not found' },
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
    const { data: updateData, error: updateError } = await supabase
      .from('purchase_records')
      .update({
        access_confirmed: true,
        access_confirmed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (updateError) {
      if (updateError.code === '42501') {
        console.error('Permission denied when confirming access:', updateError);
        return NextResponse.json(
          { error: 'You do not have permission to confirm this access', code: updateError.code },
          { status: 403 }
        );
      } else if (updateError.code === 'PGRST116') {
        console.error('Purchase record not found during confirmation:', updateError);
        return NextResponse.json(
          { error: 'Purchase record not found', code: updateError.code },
          { status: 404 }
        );
      } else {
        console.error('Error confirming access:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to confirm access', code: updateError.code },
          { status: 500 }
        );
      }
    }
    
    // Sprawdzenie czy dane zostały zaktualizowane
    if (!updateData || updateData.length === 0) {
      console.warn('No data returned after confirming access');
      return NextResponse.json(
        { error: 'Access confirmation may have failed' },
        { status: 500 }
      );
    }
    
    // Jeśli dostęp nie działa, utwórz spór
    if (!isWorking) {
      // Pobierz powiązaną transakcję
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('id')
        .eq('purchase_record_id', id)
        .single();
      
      if (transactionError) {
        console.error('Error fetching transaction:', transactionError);
        // Kontynuujemy mimo błędu, główna funkcjonalność została wykonana
      }
      
      const transactionId = transactionData?.id;
      
      if (!transactionId) {
        console.warn(`No transaction found for purchase ${id}`);
        // Utworzenie sporu bez ID transakcji
      }
      
      try {
        // Używamy supabaseAdmin aby ominąć RLS
        const { data: dispute, error: disputeError } = await supabaseAdmin
          .from('disputes')
          .insert({
            reporter_id: userProfileId,
            reported_entity_type: 'subscription',
            reported_entity_id: purchase.group_sub_id,
            transaction_id: transactionId,
            dispute_type: 'access',
            description: 'Automatyczne zgłoszenie: problem z dostępem do subskrypcji',
            status: 'open',
            evidence_required: true,
            resolution_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 dni
          })
          .select()
          .single();
        
        if (disputeError) {
          console.error('Error creating dispute:', disputeError);
          return NextResponse.json({
            message: 'Access confirmation successful, but failed to create dispute record',
            confirmed: true,
            disputeCreated: false
          });
        }
        
        if (!dispute) {
          console.warn('No dispute data returned after creation');
          return NextResponse.json({
            message: 'Access confirmation successful, but dispute record may not have been created',
            confirmed: true,
            disputeCreated: false
          });
        }
        
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
        read: false
      });
    
    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (error) {
    console.error('Exception when creating notification:', error);
  }
}