// src/lib/auth-hooks.js
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { getUserByAuthId, createUserProfile } from './supabase';

/**
 * Custom hook to sync Clerk authentication with Supabase user profiles
 * @returns {Object} User profile data and loading status
 */
export function useUserProfile() {
  const { user, isLoaded: isAuthLoaded, isSignedIn } = useUser();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Skip if auth isn't loaded yet or user is not signed in
    if (!isAuthLoaded || !isSignedIn || !user) {
      setIsLoading(false);
      return;
    }

    async function syncUserProfile() {
      try {
        setIsLoading(true);
        setError(null);

        // Try to get existing user profile
        const userId = user.id;
        const userProfile = await getUserByAuthId(userId);

        if (userProfile) {
          // User already exists in our database
          setProfile(userProfile);
        } else {
          // User doesn't exist, we need to create a profile
          const newUserProfile = {
            external_auth_id: userId,
            display_name: user.fullName || user.username || 'Nowy użytkownik',
            email: user.primaryEmailAddress?.emailAddress || '',
            profile_type: 'both', // Default value
            verification_level: 'basic', // Default value
          };

          const createdProfile = await createUserProfile(newUserProfile);
          setProfile(createdProfile);
        }
      } catch (err) {
        console.error('Error syncing user profile:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    syncUserProfile();
  }, [user, isAuthLoaded, isSignedIn]);

  return {
    profile,
    isLoading: isLoading || !isAuthLoaded,
    error,
    isSignedIn
  };
}

/**
 * Hook to check if current user has a specific role in a group
 * @param {string} groupId - ID of the group to check
 * @param {string} role - Role to check for (e.g., 'admin', 'member')
 * @returns {Object} Boolean indicating if user has role and loading status
 */
export function useGroupRole(groupId, role) {
  const { profile, isLoading } = useUserProfile();
  const [hasRole, setHasRole] = useState(false);
  
  useEffect(() => {
    if (!isLoading && profile && groupId) {
      // Check if user is the owner of the group
      if (role === 'owner') {
        // You would need to fetch the group details to check this
        // This is a simplified example
        const checkIfOwner = async () => {
          try {
            const response = await fetch(`/api/groups/${groupId}`);
            const data = await response.json();
            setHasRole(data.owner_id === profile.id);
          } catch (error) {
            console.error('Error checking group ownership:', error);
            setHasRole(false);
          }
        };
        
        checkIfOwner();
      } else {
        // Check if user has the specified role in the group
        const checkRole = async () => {
          try {
            const response = await fetch(`/api/groups/${groupId}/members?userId=${profile.id}`);
            const data = await response.json();
            setHasRole(data.role === role && data.status === 'active');
          } catch (error) {
            console.error('Error checking group role:', error);
            setHasRole(false);
          }
        };
        
        checkRole();
      }
    }
  }, [profile, isLoading, groupId, role]);

  return { hasRole, isLoading };
}

/**
 * Hook to check if current user owns a specific subscription offer
 * @param {string} offerId - ID of the subscription offer to check
 * @returns {Object} Boolean indicating if user is the owner and loading status
 */
export function useSubscriptionOfferOwnership(offerId) {
  const { profile, isLoading } = useUserProfile();
  const [isOwner, setIsOwner] = useState(false);
  
  useEffect(() => {
    if (!isLoading && profile && offerId) {
      const checkOwnership = async () => {
        try {
          const response = await fetch(`/api/offers/${offerId}/ownership`);
          const data = await response.json();
          setIsOwner(data.isOwner);
        } catch (error) {
          console.error('Error checking offer ownership:', error);
          setIsOwner(false);
        }
      };
      
      checkOwnership();
    }
  }, [profile, isLoading, offerId]);

  return { isOwner, isLoading };
}