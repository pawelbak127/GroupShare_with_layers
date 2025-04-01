import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import supabase from '@/lib/supabase-client';

/**
 * GET /api/groups/[id]
 * Pobiera szczegóły grupy
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Pobierz szczegóły grupy
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        *,
        owner:user_profiles!owner_id(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (groupError) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik jest członkiem grupy
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role, status')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single();

    if (membershipError) {
      return NextResponse.json(
        { error: 'You do not have access to this group' },
        { status: 403 }
      );
    }

    // Pobierz wszystkich członków grupy
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        user:user_profiles(
          id,
          display_name,
          avatar_url,
          verification_level
        )
      `)
      .eq('group_id', id)
      .eq('status', 'active');

    if (membersError) {
      console.error('Error fetching group members:', membersError);
    }

    // Pobierz subskrypcje grupy
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('group_subs')
      .select(`
        id,
        platform_id,
        status,
        slots_total,
        slots_available,
        price_per_slot,
        currency,
        instant_access,
        created_at,
        updated_at,
        subscription_platforms(
          id,
          name,
          icon,
          requirements_text,
          requirements_icon
        )
      `)
      .eq('group_id', id);

    if (subscriptionsError) {
      console.error('Error fetching group subscriptions:', subscriptionsError);
    }

    return NextResponse.json({
      ...group,
      members: members || [],
      subscriptions: subscriptions || [],
      userRole: membership.role,
      isOwner: group.owner_id === user.id
    });
  } catch (error) {
    console.error('Error in group details API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/[id]
 * Aktualizuje grupę
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;

    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Pobierz grupę, aby sprawdzić uprawnienia
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (groupError) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik jest właścicielem grupy
    if (group.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this group' },
        { status: 403 }
      );
    }

    // Pobierz dane żądania
    const body = await request.json();
    const { name, description } = body;

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    updates.updated_at = new Date().toISOString();

    // Aktualizuj grupę
    const { data: updatedGroup, error: updateError } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating group:', updateError);
      return NextResponse.json(
        { error: 'Failed to update group' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error in update group API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[id]
 * Usuwa grupę
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Sprawdź autentykację
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Pobierz grupę, aby sprawdzić uprawnienia
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (groupError) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Sprawdź, czy użytkownik jest właścicielem grupy
    if (group.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this group' },
        { status: 403 }
      );
    }

    // Usuń grupę
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting group:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Group deleted successfully' 
    });
  } catch (error) {
    console.error('Error in delete group API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}