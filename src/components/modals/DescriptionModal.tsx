"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Save, Edit3 } from "lucide-react";
import { BaseModal } from "@/components/ui/BaseModal";

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const DescriptionModal: React.FC<DescriptionModalProps> = ({ isOpen, onClose, data }) => {
  const [description, setDescription] = useState(data?.description as string || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // TODO: In a real implementation, this would save the description to the backend
    setIsEditing(false);
    onClose();
  };

  const handleCancel = () => {
    setDescription(data?.description as string || '');
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
      className="max-h-[80vh] flex flex-col"
    >
      <div className="flex-1 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={8}
                  placeholder="Enter a description..."
                />
              ) : (
                <div className="p-3 border rounded-lg bg-muted/30 min-h-[200px]">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t">
          <Button
            variant="outline"
            onClick={isEditing ? handleCancel : onClose}
          >
            {isEditing ? 'Cancel' : 'Close'}
          </Button>
          
          {isEditing ? (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Description
            </Button>
          )}
        </div>
    </BaseModal>
  );
};
