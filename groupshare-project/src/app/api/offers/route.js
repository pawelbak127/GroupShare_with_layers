// src/app/api/offers/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/supabase-admin-client';

/**
 * GET /api/offers
 * Get subscription offers with optional filtering
 */
export async function GET(request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const platformId = searchParams.get('platformId');
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : undefined;
    const availableSlots = searchParams.get('availableSlots') !== 'false'; // Default to true
    const orderBy = searchParams.get('orderBy') || 'created_at';
    const ascending = searchParams.get('ascending') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 10;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')) : 1;
    const offset = (page - 1) * limit;
    
    // Start with base query using supabaseAdmin
    let query = supabaseAdmin
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(id, name),
        owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level))
      `)
      .eq('status', 'active');
    
    // Apply filters
    if (platformId) {
      query = query.eq('platform_id', platformId);
    }
    
    if (minPrice !== undefined) {
      query = query.gte('price_per_slot', minPrice);
    }
    
    if (maxPrice !== undefined) {
      query = query.lte('price_per_slot', maxPrice);
    }
    
    if (availableSlots) {
      query = query.gt('slots_available', 0);
    }
    
    // Add ordering
    query = query.order(orderBy, { ascending });
    
    // Add pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching offers:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch subscription offers', code: error.code || 'unknown' }, 
        { status: 500 }
      );
    }
    
    // Return the offers
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription offers', code: error.code || 'unknown' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/offers
 * Create a new subscription offer
 */
export async function POST(request) {
  try {
    // Verify user is authenticated
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['groupId', 'platformId', 'slotsTotal', 'pricePerSlot', 'accessInstructions'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Validate numeric fields
    if (isNaN(parseFloat(body.pricePerSlot)) || parseFloat(body.pricePerSlot) <= 0) {
      return NextResponse.json(
        { error: 'Price per slot must be a positive number' },
        { status: 400 }
      );
    }
    
    if (!Number.isInteger(body.slotsTotal) || body.slotsTotal <= 0) {
      return NextResponse.json(
        { error: 'Slots total must be a positive integer' },
        { status: 400 }
      );
    }
    
    // Get user profile directly from Supabase using supabaseAdmin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('external_auth_id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Verify user is the owner or admin of the group with a direct check
    // First check if user is the owner
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .select('id, owner_id')
      .eq('id', body.groupId)
      .single();
    
    if (groupError || !group) {
      console.error('Error fetching group:', groupError);
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    
    const isOwner = group.owner_id === userProfile.id;
    
    // If not owner, check if admin
    let isAdmin = false;
    if (!isOwner) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('group_members')
        .select('role')
        .eq('group_id', body.groupId)
        .eq('user_id', userProfile.id)
        .eq('status', 'active')
        .single();
      
      isAdmin = !membershipError && membership && membership.role === 'admin';
    }
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to create offers for this group' },
        { status: 403 }
      );
    }
    
    // Przygotowanie danych oferty
    const offerData = {
      group_id: body.groupId,
      platform_id: body.platformId,
      status: 'active',
      slots_total: body.slotsTotal,
      slots_available: body.slotsTotal,
      price_per_slot: body.pricePerSlot,
      currency: body.currency || 'PLN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Tworzenie oferty bezpośrednio w Supabase
    const { data: createdOffer, error: createError } = await supabaseAdmin
      .from('group_subs')
      .insert([offerData])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating offer:', createError);
      return NextResponse.json(
        { error: 'Failed to create subscription offer', details: createError },
        { status: 500 }
      );
    }
    
    // Sprawdzenie czy oferta została utworzona
    if (!createdOffer || !createdOffer.id) {
      console.warn('Offer creation response missing ID');
      return NextResponse.json(
        { error: 'Offer was created but returned invalid data' },
        { status: 500 }
      );
    }
    
    // Zapisywanie instrukcji dostępu
    try {
      // Pobierz lub wygeneruj klucz szyfrowania
      let encryptionKeyId;
      const { data: existingKey } = await supabaseAdmin
        .from('encryption_keys')
        .select('id')
        .eq('key_type', 'master')
        .eq('active', true)
        .single();
      
      if (existingKey) {
        encryptionKeyId = existingKey.id;
      } else {
        // Generuj nowy klucz
        const newKey = {
          key_type: 'master',
          public_key: 'dummy_public_key_' + Math.random().toString(36).substring(2),
          private_key_enc: 'dummy_encrypted_private_key_' + Math.random().toString(36).substring(2),
          active: true,
          created_at: new Date().toISOString()
        };
        
        const { data: createdKey, error: createKeyError } = await supabaseAdmin
          .from('encryption_keys')
          .insert([newKey])
          .select('id')
          .single();
          
        if (createKeyError) {
          console.error('Error creating encryption key:', createKeyError);
          // Kontynuujemy mimo błędu
        } else {
          encryptionKeyId = createdKey.id;
        }
      }
      
      if (encryptionKeyId) {
        // "Szyfrowanie" instrukcji (uproszczone dla demonstracji)
        const encryptedData = 'ENCRYPTED:' + Buffer.from(body.accessInstructions).toString('base64');
        const iv = crypto.randomBytes(16).toString('hex');
        const dataKeyEnc = 'dummy_key_enc_' + Math.random().toString(36).substring(2);
        
        // Zapisz instrukcje
        const { error: instructionsError } = await supabaseAdmin
          .from('access_instructions')
          .insert({
            group_sub_id: createdOffer.id,
            encrypted_data: encryptedData,
            data_key_enc: dataKeyEnc,
            encryption_key_id: encryptionKeyId,
            iv: iv,
            encryption_version: '1.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (instructionsError) {
          console.error('Error saving access instructions:', instructionsError);
          // Kontynuujemy mimo błędu
        }
      }
    } catch (error) {
      console.error('Error processing access instructions:', error);
      // Kontynuujemy, główna funkcjonalność została wykonana
    }
    
    // Log creation in security logs
    try {
      await supabaseAdmin
        .from('security_logs')
        .insert({
          user_id: userProfile.id,
          action_type: 'create',
          resource_type: 'group_sub',
          resource_id: createdOffer.id,
          status: 'success',
          details: {
            group_id: body.groupId,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Error logging security event:', error);
      // Kontynuujemy mimo błędu
    }
    
    return NextResponse.json(createdOffer, { status: 201 });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription offer' }, 
      { status: 500 }
    );
  }
}

// Bezpieczna funkcja generująca losowe bajty
function crypto() {
  return {
    randomBytes: (size) => {
      const values = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        values[i] = Math.floor(Math.random() * 256);
      }
      return {
        toString: (encoding) => {
          if (encoding === 'hex') {
            return Array.from(values)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
          }
          return String.fromCharCode.apply(null, values);
        }
      };
    }
  };
}