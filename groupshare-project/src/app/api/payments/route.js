import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import crypto from 'crypto';
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
    
    console.log('Processing payment for user:', user.id);
    
    // Pobierz profil użytkownika bezpośrednio z Supabase używając supabaseAdmin
    let userProfile;
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('external_auth_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        throw new Error('Failed to fetch user profile');
      }
      
      if (!data) {
        console.log('User profile not found, creating new profile');
        
        // Tworzenie nowego profilu
        const newProfile = {
          external_auth_id: user.id,
          display_name: user.firstName 
            ? `${user.firstName} ${user.lastName || ''}`.trim() 
            : (user.username || 'Nowy użytkownik'),
          email: user.emailAddresses[0]?.emailAddress || '',
          phone_number: user.phoneNumbers[0]?.phoneNumber || null,
          profile_type: 'buyer',
          verification_level: 'basic',
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
          throw new Error('Failed to create user profile');
        }
        
        userProfile = createdProfile;
      } else {
        userProfile = data;
      }
      
      console.log('User profile found/created:', userProfile.id);
    } catch (error) {
      console.error('Error fetching or creating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve user profile', details: error.message },
        { status: 500 }
      );
    }
    
    // Pobierz zakup i powiązaną ofertę używając supabaseAdmin
    const { data: purchase, error: purchaseError } = await supabaseAdmin
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
    if (purchase.user_id !== userProfile.id) {
      console.warn(`Security warning: User ${userProfile.id} attempted to process payment for purchase ${purchaseId} belonging to user ${purchase.user_id}`);
      return NextResponse.json(
        { error: 'You do not have permission to process this payment' },
        { status: 403 }
      );
    }
    
    // Pobierz właściciela grupy
    const sellerId = purchase.group_sub.groups.owner_id;
    if (!sellerId) {
      console.error('Error: Could not determine seller ID for transaction');
      return NextResponse.json(
        { error: 'Could not determine seller for transaction' },
        { status: 500 }
      );
    }
    
    // Wywołaj funkcje przetwarzania płatności bezpośrednio z supabaseAdmin
    // Krok 1: Utwórz transakcję
    const transactionId = await createTransaction(
      userProfile.id,
      sellerId,
      purchase.group_sub_id,
      purchaseId,
      purchase.group_sub.price_per_slot,
      paymentMethod
    );
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }
    
    // Krok 2: Zaktualizuj zakup i ukończ transakcję
    const paymentCompleted = await completeTransaction(transactionId, purchaseId);
    
    if (!paymentCompleted) {
      return NextResponse.json(
        { error: 'Failed to complete transaction' },
        { status: 500 }
      );
    }
    
    // Wygeneruj token dostępu
    const token = generateToken();
    
    try {
      // Zapisanie tokenu dostępu za pomocą klienta administratora
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
    
    // Zaloguj operację w security_logs
    await supabaseAdmin
      .from('security_logs')
      .insert({
        user_id: userProfile.id,
        action_type: 'payment_processed',
        resource_type: 'purchase_record',
        resource_id: purchaseId,
        status: 'success',
        details: {
          transaction_id: transactionId,
          payment_method: paymentMethod,
          timestamp: new Date().toISOString()
        }
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
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// Funkcja do tworzenia transakcji
async function createTransaction(buyerId, sellerId, groupSubId, purchaseRecordId, amount, paymentMethod) {
  try {
    // Stała prowizja platformy - 5%
    const platformFeePercent = 0.05;
    const platformFee = amount * platformFeePercent;
    const sellerAmount = amount - platformFee;
    
    const paymentId = 'pmt_' + Math.random().toString(36).substr(2, 9);
    
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        group_sub_id: groupSubId,
        purchase_record_id: purchaseRecordId,
        amount: amount,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        currency: 'PLN', // Domyślna waluta
        payment_method: paymentMethod,
        payment_provider: 'stripe', // Możemy dostosować w zależności od wyboru
        payment_id: paymentId,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Exception creating transaction:', error);
    return null;
  }
}

// Funkcja do ukończenia transakcji
async function completeTransaction(transactionId, purchaseRecordId) {
  try {
    // Zaktualizuj transakcję jako ukończoną
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);
    
    if (transactionError) {
      console.error('Error completing transaction:', transactionError);
      return false;
    }
    
    // Zaktualizuj rekord zakupu jako ukończony i z dostępem
    const { error: purchaseError } = await supabaseAdmin
      .from('purchase_records')
      .update({
        status: 'completed',
        access_provided: true,
        access_provided_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseRecordId);
    
    if (purchaseError) {
      console.error('Error updating purchase record:', purchaseError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception completing transaction:', error);
    return false;
  }
}

// Funkcja generująca bezpieczny token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Bezpieczna funkcja hashująca token
function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token + (process.env.TOKEN_SALT || ''))
    .digest('hex');
}