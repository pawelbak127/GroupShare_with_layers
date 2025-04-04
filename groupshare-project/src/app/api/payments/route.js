import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabase from '@/lib/supabase-client';
import supabaseAdmin from '@/lib/supabase-admin-client';

/**
 * POST /api/payments
 * Przetwarza płatność za subskrypcję i automatycznie przyznaje dostęp
 */
export async function POST(request) {
  try {
    const { purchaseId, paymentMethod } = await request.json();
    
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
      console.error('Error fetching or creating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve user profile' },
        { status: 500 }
      );
    }
    
    // Pobierz zakup i powiązaną ofertę
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_records')
      .select(`
        id, status, group_sub_id, user_id,
        group_sub:group_subs(price_per_slot, currency, groups(owner_id))
      `)
      .eq('id', purchaseId)
      .single();
    
    if (purchaseError) {
      console.error('Error fetching purchase:', purchaseError);
      return NextResponse.json(
        { error: purchaseError.message || 'Purchase not found', code: purchaseError.code },
        { status: 404 }
      );
    }
    
    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase record not found' },
        { status: 404 }
      );
    }
    
    // Sprawdź, czy zakup należy do użytkownika
    if (purchase.user_id !== userProfileId) {
      console.warn(`Security warning: User ${userProfileId} attempted to process payment for purchase ${purchaseId} belonging to user ${purchase.user_id}`);
      return NextResponse.json(
        { error: 'You do not have permission to process this payment' },
        { status: 403 }
      );
    }
    
    // Wywołaj funkcję process_payment z bazy danych
    const { data: paymentResult, error: paymentError } = await supabase.rpc(
      'process_payment',
      {
        p_user_id: userProfileId,
        p_group_sub_id: purchase.group_sub_id,
        p_payment_method: paymentMethod,
        p_payment_provider: 'stripe', // Możemy dostosować w zależności od wyboru
        p_payment_id: 'pmt_' + Math.random().toString(36).substr(2, 9) // Przykładowe ID
      }
    );
    
    if (paymentError) {
      console.error('Error processing payment:', paymentError);
      return NextResponse.json(
        { error: paymentError.message || 'Failed to process payment', code: paymentError.code },
        { status: 500 }
      );
    }
    
    // Generowanie bezpiecznego tokenu dostępu
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'generate_secure_token'
    );
    
    if (tokenError) {
      console.error('Error generating token:', tokenError);
      // Płatność już się powiodła, ale logujemy błąd
      // Używamy tokenu zapasowego tylko w ostateczności
    }
    
    // Użyj bezpiecznego tokenu z bazy danych lub wygeneruj zapasowy
    // W produkcji powinno być obsłużone bardziej rygorystycznie
    const token = tokenData || crypto.randomBytes(32).toString('hex');
    
    try {
      // Zapisanie tokenu dostępu używając administratora Supabase (aby ominąć RLS)
      const { error: insertError } = await supabaseAdmin
        .from('access_tokens')
        .insert({
          purchase_record_id: purchaseId,
          token_hash: hashToken(token), 
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minut
          used: false
        });
        
      if (insertError) {
        console.error('Error saving access token:', insertError);
        // Kontynuujemy, ale logujemy błąd
      }
    } catch (insertError) {
      console.error('Exception when saving access token:', insertError);
      // Kontynuujemy mimo błędu, płatność już została zrealizowana
    }
    
    // Tworzymy URL dostępu
    const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/access?id=${purchaseId}&token=${token}`;
    
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      purchaseId: purchaseId,
      accessUrl: accessUrl
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Bezpieczna funkcja hashująca token
function hashToken(token) {
  return require('crypto')
    .createHash('sha256')
    .update(token + process.env.TOKEN_SALT || '')
    .digest('hex');
}