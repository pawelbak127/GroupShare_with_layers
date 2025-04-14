// src/app/api/platforms/route.js
import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabase-admin-client';

/**
 * GET /api/platforms
 * Get available subscription platforms
 */
export async function GET() {
  try {
    console.log('Fetching platforms with admin client...');
    
    const { data, error } = await supabaseAdmin
      .from('subscription_platforms')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching platforms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch platforms', details: error }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in platforms API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    );
  }
}