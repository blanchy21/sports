'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/client';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  recentTags?: string[];
  placeholder?: string;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  maxTags = 10,
  recentTags = [],
  placeholder = 'Add tags...',
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // If the user types a comma or space, add the tag
    if (newValue.endsWith(',') || newValue.endsWith(' ')) {
      const tag = newValue.slice(0, -1).trim().toLowerCase();
      addTag(tag);
    } else {
      setInputValue(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = inputValue.trim().toLowerCase();
      addTag(tag);
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove the last tag when backspace is pressed on empty input
      removeTag(value[value.length - 1]);
    }
  };

  const addTag = (tag: string) => {
    if (!tag) return;

    // Clean the tag (remove special characters, limit length)
    const cleanTag = tag.replace(/[^a-z0-9-]/g, '').slice(0, 24);

    if (!cleanTag) return;

    // Check if tag already exists or max reached
    if (value.includes(cleanTag)) {
      setInputValue('');
      return;
    }

    if (value.length >= maxTags) {
      return;
    }

    onChange([...value, cleanTag]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleRecentTagClick = (tag: string) => {
    if (!value.includes(tag) && value.length < maxTags) {
      onChange([...value, tag]);
    }
  };

  // Filter recent tags to exclude already selected ones
  const availableRecentTags = recentTags.filter((tag) => !value.includes(tag));

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tag count label */}
      <div className="flex items-center justify-between">
        <label className="text-foreground text-sm font-medium">Tags</label>
        <span className="text-muted-foreground text-xs">
          {value.length}/{maxTags}
        </span>
      </div>

      {/* Tag input container */}
      <div
        className={cn(
          'bg-background flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border p-2',
          'focus-within:ring-ring focus-within:border-transparent focus-within:ring-2',
          'cursor-text transition-colors'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {value.map((tag) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5',
              'bg-primary/10 text-primary text-sm font-medium'
            )}
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:bg-primary/20 rounded p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Input field */}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className={cn(
              'min-w-[120px] flex-1 border-none bg-transparent outline-hidden',
              'placeholder:text-muted-foreground text-sm'
            )}
          />
        )}
      </div>

      {/* Recently used tags */}
      {availableRecentTags.length > 0 && value.length < maxTags && (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Recently used:</span>
          <div className="flex flex-wrap gap-1.5">
            {availableRecentTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleRecentTagClick(tag)}
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs',
                  'bg-muted text-muted-foreground hover:bg-muted/80',
                  'transition-colors'
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      <p className="text-muted-foreground text-xs">
        Press Enter or comma to add tags. Tags help others discover your post.
      </p>
    </div>
  );
}
