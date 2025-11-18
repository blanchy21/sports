import { useState, useEffect } from 'react';
import { fetchUserProfile } from '@/lib/hive-workerbee/account';

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
      setProfile(cachedProfile);
      return;
    }

    // Fetch profile data
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const profileData = await fetchUserProfile(username);
        if (profileData) {
          // Map the profile data to our expected format
          const mappedProfile: UserProfile = {
            username: username,
            displayName: profileData.name,
            avatar: profileData.profileImage,
            reputation: 0, // Will be updated when full account data is fetched
            reputationFormatted: '0' // Will be updated when full account data is fetched
          };
          
          // Cache the profile
          profileCache.set(username, mappedProfile);
          setProfile(mappedProfile);
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
