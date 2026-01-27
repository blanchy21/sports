'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/core/Button';
import { Save, Edit3, Loader2 } from 'lucide-react';
import { BaseModal } from '@/components/core/BaseModal';

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
  /** Optional callback when description is saved. If not provided, modal just closes. */
  onSave?: (description: string) => Promise<void> | void;
}

export const DescriptionModal: React.FC<DescriptionModalProps> = ({
  isOpen,
  onClose,
  data,
  onSave,
}) => {
  const [description, setDescription] = useState((data?.description as string) || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setDescription((data?.description as string) || '');
      setIsEditing(false);
      setError(null);
    }
  }, [isOpen, data]);

  const handleSave = async () => {
    setError(null);

    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(description);
        setIsEditing(false);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save description');
      } finally {
        setIsSaving(false);
      }
    } else {
      // No onSave callback - just close the modal
      setIsEditing(false);
      onClose();
    }
  };

  const handleCancel = () => {
    setDescription((data?.description as string) || '');
    setIsEditing(false);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <Edit3 className="h-5 w-5" />
          <span>Edit Description</span>
        </div>
      }
      size="lg"
      className="flex max-h-[80vh] flex-col"
    >
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                rows={8}
                placeholder="Enter a description..."
              />
            ) : (
              <div className="min-h-[200px] rounded-lg border bg-muted/30 p-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {description || 'No description available.'}
                </p>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• Keep descriptions concise and informative</p>
            <p>• Use markdown formatting for better readability</p>
            <p>• Descriptions help other users understand your content</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end space-x-3 border-t p-6">
        <Button variant="outline" onClick={isEditing ? handleCancel : onClose} disabled={isSaving}>
          {isEditing ? 'Cancel' : 'Close'}
        </Button>

        {isEditing ? (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Description
          </Button>
        )}
      </div>
    </BaseModal>
  );
};
