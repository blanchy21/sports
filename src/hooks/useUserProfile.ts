import { useState, useEffect } from 'react';
import { fetchUserProfileBasic } from '@/lib/hive/account';

interface UserProfile {
  username: string;
  displayName?: string;
  avatar?: string;
  reputation?: number;
  reputationFormatted?: string;
}

// Cache for user profiles to avoid repeated API calls
const profileCache = new Map<string, UserProfile>();

export const useUserProfile = (username: string | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      return;
    }

    // Check cache first
    const cachedProfile = profileCache.get(username);
    if (cachedProfile) {
      console.log('Using cached profile for:', username, cachedProfile);
      setProfile(cachedProfile);
      return;
    }

    // Fetch profile data
    const fetchProfile = async () => {
      console.log('Fetching profile for:', username);
      setIsLoading(true);
      setError(null);
      
      try {
        const profileData = await fetchUserProfileBasic(username);
        console.log('Profile data received for:', username, profileData);
        if (profileData) {
          // Cache the profile
          profileCache.set(username, profileData);
          setProfile(profileData);
        } else {
          console.log('No profile data found for:', username);
          setError('Profile not found');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  return { profile, isLoading, error };
};
