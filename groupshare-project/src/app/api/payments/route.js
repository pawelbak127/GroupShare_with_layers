import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import supabase from '@/lib/supabase-client';

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
    
    // Pobierz profil użytkownika
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Pobierz zakup i powiązaną ofertę
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_records')
      .select(`
        id, status, group_sub_id,
        group_sub:group_subs(price_per_slot, currency, groups(owner_id))
      `)
      .eq('id', purchaseId)
      .single();
    
    if (purchaseError || !purchase) {
      console.error('Error fetching purchase:', purchaseError);
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }
    
    // Sprawdź, czy zakup należy do użytkownika
    if (purchase.user_id !== userProfile.id) {
      return NextResponse.json(
        { error: 'You do not have permission to process this payment' },
        { status: 403 }
      );
    }
    
    // Wywołaj funkcję process_payment z bazy danych
    const { data: paymentResult, error: paymentError } = await supabase.rpc(
      'process_payment',
      {
        p_user_id: userProfile.id,
        p_group_sub_id: purchase.group_sub_id,
        p_payment_method: paymentMethod,
        p_payment_provider: 'stripe', // Możemy dostosować w zależności od wyboru
        p_payment_id: 'pmt_' + Math.random().toString(36).substr(2, 9) // Przykładowe ID
      }
    );
    
    if (paymentError) {
      console.error('Error processing payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to process payment' },
        { status: 500 }
      );
    }
    
    // Generowanie tokenu dostępu
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      'generate_secure_token'
    );
    
    if (tokenError) {
      console.error('Error generating token:', tokenError);
      // Płatność już się powiodła, więc nie zwracamy błędu
    }
    
    const token = tokenData || 'fallback_token_' + Math.random().toString(36).substr(2, 9);
    
    // Zapisanie tokenu dostępu
    await supabase
      .from('access_tokens')
      .insert({
        purchase_record_id: purchaseId,
        token_hash: hashToken(token), // Funkcja hashowania powinna być zaimplementowana
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minut
        used: false
      });
    
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
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Prosta funkcja hashująca token (w produkcji powinna być mocniejsza)
function hashToken(token) {
  return require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');
}