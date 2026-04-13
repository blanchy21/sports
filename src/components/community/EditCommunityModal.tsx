'use client';

import React, { useEffect, useState } from 'react';
import { X, Users, Image as ImageIcon, Loader2, Globe, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateCommunity } from '@/lib/react-query/queries/useCommunity';
import { SPORT_CATEGORIES, CommunityType, Community } from '@/types';
import { cn } from '@/lib/utils/client';
import { logger } from '@/lib/logger';

interface EditCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
}

const COMMUNITY_TYPES: {
  value: CommunityType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can join and see posts',
    icon: <Globe className="h-5 w-5" />,
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Users request to join, posts visible to members',
    icon: <Lock className="h-5 w-5" />,
  },
  {
    value: 'invite-only',
    label: 'Invite Only',
    description: 'Only invited users can join',
    icon: <Mail className="h-5 w-5" />,
  },
];

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const EditCommunityModal: React.FC<EditCommunityModalProps> = ({
  isOpen,
  onClose,
  community,
}) => {
  const { user } = useAuth();
  const updateCommunityMutation = useUpdateCommunity();

  const [formData, setFormData] = useState({
    name: community.name,
    about: community.about ?? '',
    description: community.description ?? '',
    sportCategory: community.sportCategory ?? '',
    type: (community.type ?? 'public') as CommunityType,
    avatar: community.avatar ?? '',
    coverImage: community.coverImage ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refresh form when a different community is opened or the modal is reopened.
  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      name: community.name,
      about: community.about ?? '',
      description: community.description ?? '',
      sportCategory: community.sportCategory ?? '',
      type: (community.type ?? 'public') as CommunityType,
      avatar: community.avatar ?? '',
      coverImage: community.coverImage ?? '',
    });
    setErrors({});
  }, [isOpen, community]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleTypeChange = (type: CommunityType) => {
    setFormData((prev) => ({ ...prev, type }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be at most 100 characters';
    }

    if (!formData.about.trim()) {
      newErrors.about = 'Short description is required';
    } else if (formData.about.trim().length < 10) {
      newErrors.about = 'Description must be at least 10 characters';
    } else if (formData.about.length > 500) {
      newErrors.about = 'Description must be at most 500 characters';
    }

    if (formData.avatar && !isValidUrl(formData.avatar)) {
      newErrors.avatar = 'Please enter a valid URL';
    }
    if (formData.coverImage && !isValidUrl(formData.coverImage)) {
      newErrors.coverImage = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    try {
      await updateCommunityMutation.mutateAsync({
        communityId: community.id,
        userId: user.id,
        updates: {
          name: formData.name.trim(),
          about: formData.about.trim(),
          description: formData.description.trim(),
          sportCategory: formData.sportCategory || undefined,
          type: formData.type,
          avatar: formData.avatar.trim() || undefined,
          coverImage: formData.coverImage.trim() || undefined,
        },
      });
      onClose();
    } catch (error) {
      logger.error('Failed to update community', 'EditCommunityModal', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to update community',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-community-title"
    >
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-sb-stadium">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-sb-stadium p-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 id="edit-community-title" className="text-xl font-semibold">
                Edit Community
              </h2>
              <p className="text-sm text-muted-foreground">Update details for @{community.slug}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Community Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={cn(
                'w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.name && 'border-destructive'
              )}
            />
            {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              The URL slug (<code>/community/{community.slug}</code>) doesn&apos;t change when you
              rename the community.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Short Description <span className="text-destructive">*</span>
            </label>
            <textarea
              name="about"
              value={formData.about}
              onChange={handleInputChange}
              rows={2}
              className={cn(
                'w-full resize-none rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.about && 'border-destructive'
              )}
            />
            <div className="mt-1 flex justify-between">
              {errors.about ? <p className="text-sm text-destructive">{errors.about}</p> : <span />}
              <span className="text-xs text-muted-foreground">{formData.about.length}/500</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Extended Description / Rules</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full resize-none rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Sport Category</label>
            <select
              name="sportCategory"
              value={formData.sportCategory}
              onChange={handleInputChange}
              className="w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a sport</option>
              {SPORT_CATEGORIES.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.icon} {sport.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Community Type</label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {COMMUNITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-all',
                    formData.type === type.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-sb-border hover:border-primary/50'
                  )}
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <span
                      className={cn(
                        formData.type === type.value ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {type.icon}
                    </span>
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                <ImageIcon className="mr-1 inline h-4 w-4" />
                Avatar URL
              </label>
              <input
                type="text"
                name="avatar"
                value={formData.avatar}
                onChange={handleInputChange}
                placeholder="https://example.com/avatar.jpg"
                className={cn(
                  'w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.avatar && 'border-destructive'
                )}
              />
              {errors.avatar && <p className="mt-1 text-sm text-destructive">{errors.avatar}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                <ImageIcon className="mr-1 inline h-4 w-4" />
                Cover Image URL
              </label>
              <input
                type="text"
                name="coverImage"
                value={formData.coverImage}
                onChange={handleInputChange}
                placeholder="https://example.com/cover.jpg"
                className={cn(
                  'w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.coverImage && 'border-destructive'
                )}
              />
              {errors.coverImage && (
                <p className="mt-1 text-sm text-destructive">{errors.coverImage}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateCommunityMutation.isPending}
              className="min-w-[140px]"
            >
              {updateCommunityMutation.isPending ? (
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
      </Card>
    </div>
  );
};
