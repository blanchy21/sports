"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, Save, Edit3 } from "lucide-react";

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const DescriptionModal: React.FC<DescriptionModalProps> = ({ isOpen, onClose, data }) => {
  const [description, setDescription] = useState(data?.description as string || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // In a real implementation, this would save the description
    console.log('Saving description:', description);
    setIsEditing(false);
    onClose();
  };

  const handleCancel = () => {
    setDescription(data?.description as string || '');
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Edit3 className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Edit Description</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
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
      </div>
    </div>
  );
};
