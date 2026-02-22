'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/core/Button';
import { BaseModal, ModalFooter } from '@/components/core/BaseModal';
import { Avatar } from '@/components/core/Avatar';
import { useToast, toast } from '@/components/core/Toast';
import {
  Loader2,
  User,
  FileText,
  MapPin,
  Link as LinkIcon,
  Image as ImageIcon,
  Camera,
} from 'lucide-react';
import { updateHiveProfile, ProfileUpdateData } from '@/lib/hive-workerbee/social';
import { logger } from '@/lib/logger';
import { useBroadcast } from '@/hooks/useBroadcast';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, authType, refreshHiveAccount } = useAuth();
  const { addToast } = useToast();
  const { broadcast } = useBroadcast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    about: '',
    location: '',
    website: '',
    profile_image: '',
    cover_image: '',
  });

  // Initialize form with current profile data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.hiveProfile?.name || user.displayName || '',
        about: user.hiveProfile?.about || user.bio || '',
        location: user.hiveProfile?.location || '',
        website: user.hiveProfile?.website || '',
        profile_image: user.hiveProfile?.profileImage || user.avatar || '',
        cover_image: user.hiveProfile?.coverImage || '',
      });
    }
  }, [isOpen, user]);

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.username) {
      addToast(
        toast.error('Authentication Required', 'You must be logged in to update your profile')
      );
      return;
    }

    if (authType !== 'hive') {
      addToast(
        toast.error('Hive Account Required', 'Profile editing is only available for Hive users')
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare profile data - only include changed fields
      const profileData: ProfileUpdateData = {};

      if (formData.name !== (user.hiveProfile?.name || '')) {
        profileData.name = formData.name;
      }
      if (formData.about !== (user.hiveProfile?.about || '')) {
        profileData.about = formData.about;
      }
      if (formData.location !== (user.hiveProfile?.location || '')) {
        profileData.location = formData.location;
      }
      if (formData.website !== (user.hiveProfile?.website || '')) {
        profileData.website = formData.website;
      }
      if (formData.profile_image !== (user.hiveProfile?.profileImage || '')) {
        profileData.profile_image = formData.profile_image;
      }
      if (formData.cover_image !== (user.hiveProfile?.coverImage || '')) {
        profileData.cover_image = formData.cover_image;
      }

      // Check if anything changed
      if (Object.keys(profileData).length === 0) {
        addToast(toast.info('No Changes', 'No changes were made to your profile'));
        onClose();
        return;
      }

      const result = await updateHiveProfile(user.username, profileData, broadcast);

      if (result.success) {
        addToast(
          toast.success('Profile Updated', 'Your changes will appear on the blockchain shortly.')
        );

        // Refresh profile data after a short delay to allow blockchain propagation
        setTimeout(async () => {
          try {
            await refreshHiveAccount();
          } catch (err) {
            logger.error('Error refreshing profile', 'EditProfileModal', err);
          }
        }, 3000);

        onClose();
      } else {
        addToast(toast.error('Update Failed', result.error || 'Failed to update profile'));
      }
    } catch (error) {
      logger.error('Error updating profile', 'EditProfileModal', error);
      addToast(
        toast.error(
          'Error',
          error instanceof Error ? error.message : 'An unexpected error occurred'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only show for Hive users
  if (authType !== 'hive') {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="md">
        <div className="py-8 text-center">
          <div className="mb-4 text-6xl">🔐</div>
          <h3 className="mb-2 text-lg font-semibold">Hive Account Required</h3>
          <p className="text-muted-foreground">
            Profile editing is only available for users logged in with a Hive account.
          </p>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      description="Update your Hive profile information. Changes are stored on the blockchain."
      size="lg"
      className="max-h-[90vh]"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preview Section */}
        <div className="bg-muted/30 relative overflow-hidden rounded-lg">
          {/* Cover Image Preview */}
          <div
            className="from-primary via-bright-cobalt to-accent h-24 bg-linear-to-r"
            style={
              formData.cover_image
                ? {
                    backgroundImage: `url(${formData.cover_image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : {}
            }
          />

          {/* Avatar Preview */}
          <div className="absolute bottom-0 left-4 translate-y-1/2">
            <Avatar
              src={formData.profile_image}
              alt={formData.name || user?.username || 'Profile'}
              fallback={user?.username || 'U'}
              size="lg"
              className="border-background h-16 w-16 border-4"
            />
          </div>
        </div>

        <div className="space-y-4 pt-8">
          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
              <User className="text-muted-foreground h-4 w-4" />
              Display Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your display name"
              value={formData.name}
              onChange={handleInputChange('name')}
              maxLength={50}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-hidden"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label htmlFor="about" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="text-muted-foreground h-4 w-4" />
              Bio
            </label>
            <textarea
              id="about"
              placeholder="Tell us about yourself..."
              value={formData.about}
              onChange={handleInputChange('about')}
              rows={3}
              maxLength={500}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full resize-none rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-hidden"
            />
            <p className="text-muted-foreground text-right text-xs">{formData.about.length}/500</p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label htmlFor="location" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="text-muted-foreground h-4 w-4" />
              Location
            </label>
            <input
              id="location"
              type="text"
              placeholder="Where are you based?"
              value={formData.location}
              onChange={handleInputChange('location')}
              maxLength={100}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-hidden"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <label htmlFor="website" className="flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="text-muted-foreground h-4 w-4" />
              Website
            </label>
            <input
              id="website"
              type="url"
              placeholder="https://yourwebsite.com"
              value={formData.website}
              onChange={handleInputChange('website')}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-hidden"
            />
          </div>

          {/* Profile Image URL */}
          <div className="space-y-2">
            <label htmlFor="profile_image" className="flex items-center gap-2 text-sm font-medium">
              <Camera className="text-muted-foreground h-4 w-4" />
              Profile Image URL
            </label>
            <input
              id="profile_image"
              type="url"
              placeholder="https://example.com/your-avatar.jpg"
              value={formData.profile_image}
              onChange={handleInputChange('profile_image')}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-hidden"
            />
            <p className="text-muted-foreground text-xs">
              Enter a URL to an image. You can upload images to services like Imgur or use existing
              image URLs.
            </p>
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <label htmlFor="cover_image" className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="text-muted-foreground h-4 w-4" />
              Cover Image URL
            </label>
            <input
              id="cover_image"
              type="url"
              placeholder="https://example.com/your-cover.jpg"
              value={formData.cover_image}
              onChange={handleInputChange('cover_image')}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-hidden"
            />
            <p className="text-muted-foreground text-xs">
              Recommended size: 1500x500 pixels for best results.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};
