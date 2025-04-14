// src/app/api/offers/[id]/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import supabaseAdmin from '@/lib/supabase-admin-client';

/**
 * GET /api/offers/[id]
 * Get details of a specific subscription offer
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Pobierz ofertę subskrypcji za pomocą supabaseAdmin
    const { data: offer, error } = await supabaseAdmin
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(id, name, description),
        owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level, bio))
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching offer:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription offer' },
        { status: 500 }
      );
    }

    if (!offer) {
      return NextResponse.json(
        { error: 'Subscription offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error fetching offer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription offer' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/offers/[id]
 * Update a subscription offer
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const updates = await request.json();

    // Get the original offer to verify ownership using supabaseAdmin
    const { data: offer, error } = await supabaseAdmin
      .from('group_subs')
      .select(`
        *,
        groups(id, owner_id)
      `)
      .eq('id', id)
      .single();

    if (error || !offer) {
      console.error('Error fetching offer:', error);
      return NextResponse.json(
        { error: 'Subscription offer not found' },
        { status: 404 }
      );
    }

    // Get user profile from Supabase using supabaseAdmin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify user is the owner or admin of the group
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', offer.groups.id)
      .eq('user_id', userProfile.id)
      .eq('status', 'active')
      .single();

    const isOwner = offer.groups.owner_id === userProfile.id;
    const isAdmin = !memberError && memberData && memberData.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to update this offer' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData = {
      status: updates.status || offer.status,
      price_per_slot: updates.pricePerSlot || offer.price_per_slot,
      slots_total: updates.slotsTotal || offer.slots_total,
      slots_available: updates.slotsAvailable !== undefined ? updates.slotsAvailable : offer.slots_available,
      currency: updates.currency || offer.currency,
      updated_at: new Date().toISOString()
    };

    // Update offer in Supabase using supabaseAdmin
    const { data: updatedOffer, error: updateError } = await supabaseAdmin
      .from('group_subs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating offer:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription offer' },
        { status: 500 }
      );
    }

    // If access instructions provided, update them
    if (updates.accessInstructions) {
      try {
        // First get existing instructions (if any) to check if we need to insert or update
        const { data: existingInstructions } = await supabaseAdmin
          .from('access_instructions')
          .select('id')
          .eq('group_sub_id', id)
          .maybeSingle();

        // Fake encryption for now - in production you'd use proper encryption
        const encryptionData = {
          encrypted_data: "ENCRYPTED:" + Buffer.from(updates.accessInstructions).toString('base64'),
          data_key_enc: "key_placeholder",
          iv: "iv_placeholder",
          encryption_version: "1.0"
        };

        if (existingInstructions && existingInstructions.id) {
          // Update existing
          await supabaseAdmin
            .from('access_instructions')
            .update({
              ...encryptionData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingInstructions.id);
        } else {
          // Get encryption key (in production this would be more complex)
          const { data: encryptionKey } = await supabaseAdmin
            .from('encryption_keys')
            .select('id')
            .eq('key_type', 'master')
            .eq('active', true)
            .single();
            
          // Create new instructions
          await supabaseAdmin
            .from('access_instructions')
            .insert({
              group_sub_id: id,
              ...encryptionData,
              encryption_key_id: encryptionKey?.id || 'missing-key-id', // In production this should be properly handled
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      } catch (encryptionError) {
        console.error('Error saving access instructions:', encryptionError);
        // Don't fail the entire operation, but log
      }
    }

    return NextResponse.json(updatedOffer);
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription offer' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/offers/[id]
 * Delete a subscription offer
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the original offer to verify ownership using supabaseAdmin
    const { data: offer, error } = await supabaseAdmin
      .from('group_subs')
      .select(`
        *,
        groups(id, owner_id)
      `)
      .eq('id', id)
      .single();

    if (error || !offer) {
      console.error('Error fetching offer:', error);
      return NextResponse.json(
        { error: 'Subscription offer not found' },
        { status: 404 }
      );
    }

    // Get user profile from Supabase using supabaseAdmin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('external_auth_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify user is the owner or admin of the group
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', offer.groups.id)
      .eq('user_id', userProfile.id)
      .eq('status', 'active')
      .single();

    const isOwner = offer.groups.owner_id === userProfile.id;
    const isAdmin = !memberError && memberData && memberData.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this offer' },
        { status: 403 }
      );
    }

    // Delete offer in Supabase using supabaseAdmin
    const { error: deleteError } = await supabaseAdmin
      .from('group_subs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting offer:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete subscription offer' },
        { status: 500 }
      );
    }

    // Log deletion in security_logs
    await supabaseAdmin
      .from('security_logs')
      .insert({
        user_id: userProfile.id,
        action_type: 'delete',
        resource_type: 'group_sub',
        resource_id: id,
        status: 'success',
        details: {
          group_id: offer.groups.id,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json(
      { message: 'Subscription offer deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription offer' },
      { status: 500 }
    );
  }
}