// src/app/api/offers/[id]/apply/route.js
import { NextResponse } from 'next/server';
import { getSubscriptionOffer, createApplication } from '@/lib/supabase';
import { currentUser } from '@clerk/nextjs';

/**
 * POST /api/offers/[id]/apply
 * Apply for a subscription offer
 */
export async function POST(request, { params }) {
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
    const body = await request.json();
    const message = body.message || '';

    // Get the subscription offer
    const offer = await getSubscriptionOffer(id);

    if (!offer) {
      return NextResponse.json(
        { error: 'Subscription offer not found' },
        { status: 404 }
      );
    }

    // Check if offer is still active and has available slots
    if (offer.status !== 'active') {
      return NextResponse.json(
        { error: 'This subscription offer is no longer active' },
        { status: 400 }
      );
    }

    if (offer.slots_available <= 0) {
      return NextResponse.json(
        { error: 'This subscription offer has no available slots' },
        { status: 400 }
      );
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

    // Check if user already has an active application for this offer
    const existingApplicationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/applications?userId=${userProfile.id}&groupSubId=${id}&active=true`,
      {
        headers: {
          'Authorization': `Bearer ${await user.getToken()}`
        }
      }
    );

    const existingApplications = await existingApplicationResponse.json();
    if (existingApplications && existingApplications.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active application for this offer' },
        { status: 400 }
      );
    }

    // Create application in Supabase
    const applicationData = {
      user_id: userProfile.id,
      group_sub_id: id,
      message,
      status: 'pending'
    };

    const application = await createApplication(applicationData);

    if (!application) {
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      );
    }

    // Send notification to the offer owner
    // This would be implemented separately with a notification system
    // For now, just log it
    console.log(`New application from ${userProfile.id} for offer ${id}`);

    return NextResponse.json(
      { 
        message: 'Application submitted successfully',
        application 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Error applying for offer:', error);
    return NextResponse.json(
      { error: 'Failed to apply for subscription offer' },
      { status: 500 }
    );
  }
}
