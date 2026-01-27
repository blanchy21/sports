'use client';

import React, { useState } from 'react';
import { X, Users, Image as ImageIcon, Loader2, Globe, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateCommunity } from '@/lib/react-query/queries/useCommunity';
import { SPORT_CATEGORIES, CommunityType } from '@/types';
import { cn } from '@/lib/utils/client';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (community: { id: string; slug: string }) => void;
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

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, hiveUser } = useAuth();
  const createCommunityMutation = useCreateCommunity();

  const [formData, setFormData] = useState({
    name: '',
    about: '',
    description: '',
    sportCategory: '',
    type: 'public' as CommunityType,
    avatar: '',
    coverImage: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
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
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be at most 100 characters';
    }

    if (!formData.about.trim()) {
      newErrors.about = 'Short description is required';
    } else if (formData.about.length < 10) {
      newErrors.about = 'Description must be at least 10 characters';
    } else if (formData.about.length > 500) {
      newErrors.about = 'Description must be at most 500 characters';
    }

    if (!formData.sportCategory) {
      newErrors.sportCategory = 'Please select a sport category';
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

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!user) return;

    try {
      const { community } = await createCommunityMutation.mutateAsync({
        input: {
          name: formData.name.trim(),
          about: formData.about.trim(),
          description: formData.description.trim(),
          sportCategory: formData.sportCategory,
          type: formData.type,
          avatar: formData.avatar || undefined,
          coverImage: formData.coverImage || undefined,
        },
        creatorId: user.id,
        creatorUsername: user.username,
        hiveUsername: hiveUser?.username,
      });

      // Reset form
      setFormData({
        name: '',
        about: '',
        description: '',
        sportCategory: '',
        type: 'public',
        avatar: '',
        coverImage: '',
      });

      onSuccess?.({ id: community.id, slug: community.slug });
      onClose();
    } catch (error) {
      console.error('Failed to create community:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create community',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-card">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card p-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Create Community</h2>
              <p className="text-sm text-muted-foreground">Build your own sports community</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Community Name */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Community Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Tottenham Supporters Club"
              className={cn(
                'w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.name && 'border-red-500'
              )}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Short Description */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="about"
              value={formData.about}
              onChange={handleInputChange}
              placeholder="Brief description of your community (10-500 characters)"
              rows={2}
              className={cn(
                'w-full resize-none rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.about && 'border-red-500'
              )}
            />
            <div className="mt-1 flex justify-between">
              {errors.about ? <p className="text-sm text-red-500">{errors.about}</p> : <span />}
              <span className="text-xs text-muted-foreground">{formData.about.length}/500</span>
            </div>
          </div>

          {/* Extended Description */}
          <div>
            <label className="mb-2 block text-sm font-medium">Extended Description / Rules</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Community guidelines, rules, and detailed description..."
              rows={4}
              className="w-full resize-none rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Sport Category */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Sport Category <span className="text-red-500">*</span>
            </label>
            <select
              name="sportCategory"
              value={formData.sportCategory}
              onChange={handleInputChange}
              className={cn(
                'w-full rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.sportCategory && 'border-red-500'
              )}
            >
              <option value="">Select a sport</option>
              {SPORT_CATEGORIES.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.icon} {sport.name}
                </option>
              ))}
            </select>
            {errors.sportCategory && (
              <p className="mt-1 text-sm text-red-500">{errors.sportCategory}</p>
            )}
          </div>

          {/* Community Type */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Community Type <span className="text-red-500">*</span>
            </label>
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
                      : 'border-border hover:border-primary/50'
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

          {/* Images */}
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
                  errors.avatar && 'border-red-500'
                )}
              />
              {errors.avatar && <p className="mt-1 text-sm text-red-500">{errors.avatar}</p>}
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
                  errors.coverImage && 'border-red-500'
                )}
              />
              {errors.coverImage && (
                <p className="mt-1 text-sm text-red-500">{errors.coverImage}</p>
              )}
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCommunityMutation.isPending}
              className="min-w-[140px]"
            >
              {createCommunityMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Create Community
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
