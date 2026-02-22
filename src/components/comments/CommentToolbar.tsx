'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/core/Button';
import {
  Bold,
  Italic,
  Smile,
  Image as ImageIcon,
  Film,
  Upload,
  Link as LinkIcon,
  X,
  Loader2,
} from 'lucide-react';
import { GifPicker } from '@/components/gif/GifPicker';
import { uploadImage } from '@/lib/hive/imageUpload';
import { validateImageUrl } from '@/lib/utils/sanitize';
import { cn } from '@/lib/utils/client';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface CommentToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  disabled?: boolean;
  username?: string;
}

export function CommentToolbar({
  textareaRef,
  text,
  setText,
  disabled,
  username,
}: CommentToolbarProps) {
  const [activePanel, setActivePanel] = useState<'emoji' | 'gif' | 'image' | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const togglePanel = (panel: 'emoji' | 'gif' | 'image') => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    if (panel === 'image') {
      setUploadError(null);
      setImageUrl('');
    }
  };

  const insertAtCursor = (insertion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + insertion);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setText((prev) => prev.slice(0, start) + insertion + prev.slice(end));
    setTimeout(() => {
      textarea.focus();
      const newPos = start + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const wrapSelection = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.slice(start, end);

    if (selectedText) {
      setText(
        (prev) => prev.slice(0, start) + `${wrapper}${selectedText}${wrapper}` + prev.slice(end)
      );
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
      }, 0);
    } else {
      setText((prev) => prev.slice(0, start) + wrapper + wrapper + prev.slice(start));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + wrapper.length, start + wrapper.length);
      }, 0);
    }
  };

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      setText((prev) => prev.slice(0, start) + emojiData.emoji + prev.slice(start));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
      }, 0);
    } else {
      setText((prev) => prev + emojiData.emoji);
    }
    setActivePanel(null);
  };

  const handleGifSelect = (gifUrl: string) => {
    insertAtCursor(`\n![gif](${gifUrl})\n`);
    setActivePanel(null);
  };

  const handleAddImageUrl = () => {
    if (!imageUrl.trim()) return;
    const validation = validateImageUrl(imageUrl.trim());
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image URL');
      return;
    }
    insertAtCursor(`\n![image](${validation.url})\n`);
    setImageUrl('');
    setUploadError(null);
    setActivePanel(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const result = await uploadImage(file, username);
      if (result.success && result.url) {
        insertAtCursor(`\n![image](${result.url})\n`);
        setActivePanel(null);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      logger.error('Image upload error', 'CommentToolbar', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Close panels on outside click
  useEffect(() => {
    if (!activePanel) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(target) &&
        !target.closest('.EmojiPickerReact')
      ) {
        setActivePanel(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePanel]);

  const btnClass = 'h-8 w-8 p-0 text-muted-foreground hover:text-primary';

  return (
    <div ref={toolbarRef} className="relative mt-2 flex items-center gap-1">
      {/* Bold */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => wrapSelection('**')}
        className={btnClass}
        title="Bold"
        disabled={disabled}
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* Italic */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => wrapSelection('*')}
        className={btnClass}
        title="Italic"
        disabled={disabled}
      >
        <Italic className="h-4 w-4" />
      </Button>

      {/* Emoji */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => togglePanel('emoji')}
          className={cn(btnClass, activePanel === 'emoji' && 'text-primary')}
          title="Add emoji"
          disabled={disabled}
        >
          <Smile className="h-4 w-4" />
        </Button>

        {activePanel === 'emoji' && (
          <div className="absolute bottom-full left-0 z-50 mb-2">
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              emojiStyle={'native' as unknown as import('emoji-picker-react').EmojiStyle}
              lazyLoadEmojis={true}
            />
          </div>
        )}
      </div>

      {/* Image */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => togglePanel('image')}
          className={cn(btnClass, activePanel === 'image' && 'text-primary')}
          title="Add image"
          disabled={disabled}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        {activePanel === 'image' && (
          <div className="bg-card absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border p-3 shadow-lg">
            <div className="mb-3 flex gap-1">
              <button
                type="button"
                onClick={() => setImageInputMode('upload')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  imageInputMode === 'upload'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setImageInputMode('url')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  imageInputMode === 'url'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                URL
              </button>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setActivePanel(null);
                  setUploadError(null);
                  setImageUrl('');
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />

            {imageInputMode === 'upload' ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-2 p-4',
                  'border-muted-foreground/30 rounded-lg border-2 border-dashed',
                  'hover:border-primary/50 hover:bg-primary/5 transition-colors',
                  'text-muted-foreground',
                  isUploadingImage && 'cursor-not-allowed opacity-50'
                )}
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="text-primary h-5 w-5 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">Click to select an image</span>
                    <span className="text-muted-foreground/70 text-xs">Max 5MB</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className="bg-background focus:ring-primary flex-1 rounded-lg border px-3 py-2 text-sm outline-hidden focus:ring-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                />
                <Button size="sm" onClick={handleAddImageUrl} disabled={!imageUrl.trim()}>
                  Add
                </Button>
              </div>
            )}

            {uploadError && <p className="text-destructive mt-2 text-sm">{uploadError}</p>}
          </div>
        )}
      </div>

      {/* GIF */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => togglePanel('gif')}
          className={cn(btnClass, activePanel === 'gif' && 'text-primary')}
          title="Add GIF"
          disabled={disabled}
        >
          <Film className="h-4 w-4" />
        </Button>

        <GifPicker
          isOpen={activePanel === 'gif'}
          onClose={() => setActivePanel(null)}
          onSelect={handleGifSelect}
        />
      </div>
    </div>
  );
}
