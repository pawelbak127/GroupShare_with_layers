// src/lib/supabase-client.js
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Create a single instance of the Supabase client to reuse across the app
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error);
  
  // Return a standardized error object
  return {
    error: true,
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'unknown_error',
    details: error.details || null,
  };
};

// Function to get a user profile by Clerk auth ID
export const getUserByAuthId = async (authId) => {
  if (!authId) return null;
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('external_auth_id', authId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Nie znaleziono - to normalny przypadek, nie musimy logować
        return null;
      } else if (error.code === '42501') {
        console.error('Permission denied when fetching user profile:', error);
        throw new Error('Permission denied when accessing user profile');
      } else {
        console.error('Error fetching user profile:', error);
        throw new Error(error.message || 'Failed to fetch user profile');
      }
    }
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    throw error; // Propagujemy błąd, aby wywołujący mógł go obsłużyć
  }
};

// Function to create a new user profile
export const createUserProfile = async (userProfile) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([userProfile])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        console.warn('Attempt to create duplicate user profile:', error);
        throw new Error('User profile already exists');
      } else if (error.code === '42501') {
        console.error('Permission denied when creating user profile:', error);
        throw new Error('Permission denied when creating user profile');
      } else if (error.code === '23502') {
        console.error('Missing required field for user profile:', error);
        throw new Error('Missing required field for user profile');
      } else {
        console.error('Error creating user profile:', error);
        throw new Error(error.message || 'Failed to create user profile');
      }
    }
    
    if (!data) {
      console.warn('No data returned after user profile creation');
      throw new Error('User profile may have been created but no data was returned');
    }
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
};

// Function to update a user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

// Function to get active subscription platforms
export const getSubscriptionPlatforms = async () => {
  try {
    const { data, error } = await supabase
      .from('subscription_platforms')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
};

// Function to get active subscription offers
export const getSubscriptionOffers = async (filters = {}) => {
  try {
    // Start with base query
    let query = supabase
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(id, name),
        owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level))
      `)
      .eq('status', 'active');
    
    // Apply filters
    if (filters.platformId) {
      query = query.eq('platform_id', filters.platformId);
    }
    
    if (filters.minPrice !== undefined) {
      query = query.gte('price_per_slot', filters.minPrice);
    }
    
    if (filters.maxPrice !== undefined) {
      query = query.lte('price_per_slot', filters.maxPrice);
    }
    
    if (filters.availableSlots === true) {
      query = query.gt('slots_available', 0);
    }
    
    // Add ordering
    const orderBy = filters.orderBy || 'created_at';
    const ascending = filters.ascending === true;
    query = query.order(orderBy, { ascending });
    
    // Add pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
};

// Function to get a specific subscription offer
export const getSubscriptionOffer = async (offerId) => {
  try {
    const { data, error } = await supabase
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(id, name, description),
        owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level, bio))
      `)
      .eq('id', offerId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

// Function to create a new application for a subscription
export const createApplication = async (application) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert([application])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

// Function to get user's applications
export const getUserApplications = async (userId, status = null) => {
  try {
    let query = supabase
      .from('applications')
      .select(`
        *,
        group_sub:group_subs(
          id, 
          price_per_slot,
          currency,
          subscription_platforms(id, name, icon)
        ),
        seller:group_subs(
          groups(
            owner_id, 
            user_profiles!inner(id, display_name, avatar_url)
          )
        )
      `)
      .eq('user_id', userId);
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
};

// Function to get received applications for group subscriptions owned by user
export const getReceivedApplications = async (userId, status = null) => {
  try {
    let query = supabase
      .from('applications')
      .select(`
        *,
        group_sub:group_subs!inner(
          id,
          price_per_slot,
          currency,
          groups!inner(
            id,
            name,
            owner_id
          ),
          subscription_platforms(id, name, icon)
        ),
        applicant:user_profiles!inner(
          id,
          display_name,
          avatar_url,
          rating_avg,
          rating_count
        )
      `)
      .eq('group_sub.groups.owner_id', userId);
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
};

// Function to update application status
export const updateApplicationStatus = async (applicationId, status) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

// Export the Supabase client
export default supabase;