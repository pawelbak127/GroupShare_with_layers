// src/app/api/payments/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs/server';

// Inicjalizacja klienta Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { purchaseId, paymentMethod } = await request.json();
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
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
    
    // Oblicz kwotę i prowizję
    const amount = purchase.group_sub.price_per_slot;
    const platformFeePercent = 0.05;
    const platformFee = amount * platformFeePercent;
    const sellerAmount = amount - platformFee;
    
    // Aktualizuj status zakupu
    const { error: updateError } = await supabase
      .from('purchase_records')
      .update({ status: 'payment_processing' })
      .eq('id', purchaseId);
      
    if (updateError) {
      console.error('Error updating purchase status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update purchase status' },
        { status: 500 }
      );
    }
    
    // Utwórz transakcję
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        buyer_id: user.id,  // Poprawiono z userProfile.id na user.id
        seller_id: purchase.group_sub.groups.owner_id,
        group_sub_id: purchase.group_sub_id,
        purchase_record_id: purchaseId,
        amount: amount,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        payment_method: paymentMethod,
        status: 'pending'
      })
      .select()
      .single();
    
    if (transactionError || !transaction) {
      console.error('Error creating transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }
    
    // W rzeczywistej implementacji: integracja z bramką płatności
    const paymentGatewayUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment-gateway/process?transactionId=${transaction.id}`;
    
    return NextResponse.json({
      id: transaction.id,
      amount,
      status: 'pending',
      payment_url: paymentGatewayUrl
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}