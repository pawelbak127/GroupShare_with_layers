// src/app/api/offers/route.js
import { NextResponse } from 'next/server';
import { getSubscriptionOffers } from '../../../lib/supabase-client.js';
import { currentUser } from '@clerk/nextjs';


/**
 * GET /api/offers
 * Get subscription offers with optional filtering
 */
export async function GET(request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters = {
      platformId: searchParams.get('platformId') || undefined,
      instantAccess: searchParams.get('instantAccess') === 'true',
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : undefined,
      availableSlots: searchParams.get('availableSlots') !== 'false', // Default to true
      orderBy: searchParams.get('orderBy') || 'created_at',
      ascending: searchParams.get('ascending') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 10,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')) : 0
    };
    
    // Get subscription offers with filters
    const offers = await getSubscriptionOffers(filters);
    
    // Return the offers
    return NextResponse.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription offers' }, 
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
    const requiredFields = ['groupId', 'platformId', 'slotsTotal', 'pricePerSlot'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Get user profile ID from Supabase
    const userProfileResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/profile`,
      {
        headers: {
          'Authorization': `Bearer ${await user.getToken()}`
        }
      }
    );
    
    const userProfile = await userProfileResponse.json();
    if (!userProfile || !userProfile.id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Verify user is the owner or admin of the group
    const groupResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/groups/${body.groupId}/members?userId=${userProfile.id}`,
      {
        headers: {
          'Authorization': `Bearer ${await user.getToken()}`
        }
      }
    );
    
    const groupMembership = await groupResponse.json();
    if (!groupMembership || (groupMembership.role !== 'admin' && !groupMembership.isOwner)) {
      return NextResponse.json(
        { error: 'You do not have permission to create offers for this group' },
        { status: 403 }
      );
    }
    
    // Prepare offer data
    const offerData = {
      group_id: body.groupId,
      platform_id: body.platformId,
      status: 'active',
      slots_total: body.slotsTotal,
      slots_available: body.slotsTotal, // Initially all slots are available
      price_per_slot: body.pricePerSlot,
      currency: body.currency || 'PLN',
      instant_access: body.instantAccess || false
    };
    
    // Create offer in Supabase
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/supabase/group_subs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getToken()}`
        },
        body: JSON.stringify(offerData)
      }
    );
    
    const createdOffer = await response.json();
    
    // If instant access is enabled, store access instructions
    if (body.instantAccess && body.accessInstructions) {
      // Store access instructions in Supabase
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/access-instructions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getToken()}`
          },
          body: JSON.stringify({
            groupSubId: createdOffer.id,
            instructions: body.accessInstructions
          })
        }
      );
    }
    
    return NextResponse.json(createdOffer, { status: 201 });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription offer' }, 
      { status: 500 }
    );
  }
}
