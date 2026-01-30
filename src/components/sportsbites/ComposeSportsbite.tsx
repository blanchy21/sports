'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import {
  Image as ImageIcon,
  Smile,
  X,
  Loader2,
  MapPin,
  Send,
  Upload,
  Link as LinkIcon,
  Film,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { SPORT_CATEGORIES } from '@/types';
import {
  SPORTSBITES_CONFIG,
  createSportsbiteOperation,
  validateSportsbiteContent,
} from '@/lib/hive-workerbee/sportsbites';
import { uploadImage } from '@/lib/hive/imageUpload';
import { validateImageUrl } from '@/lib/utils/sanitize';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface GiphyGif {
  id: string;
  title: string;
  images: {
    original: { url: string; width: string; height: string };
    fixed_height: { url: string; width: string; height: string };
    fixed_height_small: { url: string; width: string; height: string };
    fixed_width: { url: string; width: string; height: string };
    preview_gif: { url: string; width: string; height: string };
  };
}

interface ComposeSportsbiteProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

function getHiveAvatarUrl(username: string): string {
  return `https://images.hive.blog/u/${username}/avatar`;
}

export function ComposeSportsbite({ onSuccess, onError }: ComposeSportsbiteProps) {
  const { user, authType, hiveUser } = useAuth();
  const [content, setContent] = useState('');

  const hiveUsername =
    hiveUser?.username || user?.hiveUsername || (authType === 'hive' ? user?.username : undefined);
  const avatarUrl = user?.avatar || (hiveUsername ? getHiveAvatarUrl(hiveUsername) : undefined);
  const [images, setImages] = useState<string[]>([]);
  const [sportCategory, setSportCategory] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [gifs, setGifs] = useState<string[]>([]);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifResults, setGifResults] = useState<GiphyGif[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const charCount = content.length;
  const maxChars = SPORTSBITES_CONFIG.MAX_CHARS;
  const remainingChars = maxChars - charCount;
  const charPercentage = (charCount / maxChars) * 100;

  const getCharCountColor = () => {
    if (remainingChars < 0) return 'text-red-500';
    if (remainingChars <= 20) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const circleRadius = 10;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (Math.min(charPercentage, 100) / 100) * circumference;

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const newContent = content.slice(0, start) + emojiData.emoji + content.slice(start);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
      }, 0);
    } else {
      setContent(content + emojiData.emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    const validation = validateImageUrl(imageUrl.trim());
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image URL');
      return;
    }
    setImages([...images, validation.url!]);
    setImageUrl('');
    setUploadError(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
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
      const result = await uploadImage(file, user?.username);
      if (result.success && result.url) {
        setImages([...images, result.url]);
        setUploadError(null);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Failed to upload image. Please try again or use a URL.'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const loadTrendingGifs = useCallback(async () => {
    setIsLoadingGifs(true);
    setGifError(null);
    try {
      const response = await fetch('/api/giphy?type=trending&limit=24');
      if (!response.ok) throw new Error('Failed to load trending GIFs');
      const data = await response.json();
      if (data.success) {
        setGifResults(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to load trending GIFs');
      }
    } catch (error) {
      console.error('Trending GIF error:', error);
      setGifError('Failed to load GIFs. Please try again.');
    } finally {
      setIsLoadingGifs(false);
    }
  }, []);

  const searchGifs = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        loadTrendingGifs();
        return;
      }
      setIsLoadingGifs(true);
      setGifError(null);
      try {
        const response = await fetch(
          `/api/giphy?type=search&q=${encodeURIComponent(query)}&limit=24`
        );
        if (!response.ok) throw new Error('Failed to search GIFs');
        const data = await response.json();
        if (data.success) {
          setGifResults(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to search GIFs');
        }
      } catch (error) {
        console.error('GIF search error:', error);
        setGifError('Failed to load GIFs. Please try again.');
        setGifResults([]);
      } finally {
        setIsLoadingGifs(false);
      }
    },
    [loadTrendingGifs]
  );

  const handleGifSelect = (gif: GiphyGif) => {
    const gifUrl = gif.images.fixed_height?.url || gif.images.original?.url;
    if (gifUrl) {
      setGifs([...gifs, gifUrl]);
      setShowGifPicker(false);
      setGifSearchQuery('');
      setGifResults([]);
    }
  };

  const handleRemoveGif = (index: number) => {
    setGifs(gifs.filter((_, i) => i !== index));
  };

  const handlePublish = useCallback(async () => {
    if (!user || !hiveUser?.username) {
      onError?.('Please connect with Hive to post sportsbites');
      return;
    }

    const validation = validateSportsbiteContent(content);
    if (!validation.isValid) {
      onError?.(validation.errors.join(', '));
      return;
    }

    setIsPublishing(true);

    try {
      const operation = createSportsbiteOperation({
        body: content,
        author: hiveUser.username,
        sportCategory: sportCategory || undefined,
        images: images.length > 0 ? images : undefined,
        gifs: gifs.length > 0 ? gifs : undefined,
      });

      const { aioha } = await import('@/lib/aioha/config');

      const aiohaInstance = aioha as {
        signAndBroadcastTx?: (ops: unknown[], keyType: string) => Promise<unknown>;
      } | null;

      if (!aiohaInstance || typeof aiohaInstance.signAndBroadcastTx !== 'function') {
        throw new Error('Hive authentication not available. Please reconnect.');
      }

      const result = await aiohaInstance.signAndBroadcastTx([['comment', operation]], 'posting');

      if (!result || (result as { error?: string }).error) {
        throw new Error((result as { error?: string }).error || 'Failed to broadcast');
      }

      setContent('');
      setImages([]);
      setGifs([]);
      setSportCategory('');
      onSuccess?.();
    } catch (error) {
      console.error('Error publishing sportsbite:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to publish sportsbite');
    } finally {
      setIsPublishing(false);
    }
  }, [content, images, gifs, sportCategory, user, hiveUser, onSuccess, onError]);

  React.useEffect(() => {
    return () => {
      if (gifSearchTimeoutRef.current) clearTimeout(gifSearchTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(target as Node) &&
        !target.closest('.EmojiPickerReact')
      ) {
        setShowEmojiPicker(false);
      }
      if (showGifPicker && !target.closest('[data-gif-picker]')) {
        setShowGifPicker(false);
        if (gifSearchTimeoutRef.current) clearTimeout(gifSearchTimeoutRef.current);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showGifPicker]);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [content]);

  const canPublish =
    content.trim().length > 0 && remainingChars >= 0 && authType === 'hive' && !isPublishing;

  if (!user) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-muted-foreground">Sign in to post sportsbites</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="p-4">
        <div className="flex gap-3">
          <Avatar
            src={avatarUrl}
            fallback={user.username || '?'}
            alt={user.displayName || user.username || 'User'}
            size="md"
            className="flex-shrink-0"
          />

          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening in sports?"
              className={cn(
                'w-full resize-none border-none bg-transparent outline-none',
                'text-lg placeholder:text-muted-foreground/60',
                'max-h-[200px] min-h-[60px]'
              )}
              disabled={isPublishing}
            />

            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((img, index) => (
                  <div key={index} className="group relative overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Attached ${index + 1}`}
                      className="h-20 w-20 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                      }}
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {gifs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {gifs.map((gif, index) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-lg border border-purple-500/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gif} alt={`GIF ${index + 1}`} className="h-24 w-24 object-cover" />
                    <div className="absolute left-1 top-1 rounded bg-purple-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      GIF
                    </div>
                    <button
                      onClick={() => handleRemoveGif(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {sportCategory && (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary">
                  <MapPin className="h-3 w-3" />
                  {SPORT_CATEGORIES.find((s) => s.id === sportCategory)?.icon}{' '}
                  {SPORT_CATEGORIES.find((s) => s.id === sportCategory)?.name}
                  <button
                    onClick={() => setSportCategory('')}
                    className="ml-1 hover:text-primary/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}

            {showImageInput && (
              <div className="mt-3 rounded-lg border bg-muted/50 p-3">
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
                    <Upload className="h-4 w-4" />
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
                    <LinkIcon className="h-4 w-4" />
                    URL
                  </button>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowImageInput(false);
                      setUploadError(null);
                      setImageUrl('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {imageInputMode === 'upload' && (
                  <div className="space-y-2">
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className={cn(
                        'flex w-full flex-col items-center justify-center gap-2 p-4',
                        'rounded-lg border-2 border-dashed border-muted-foreground/30',
                        'transition-colors hover:border-primary/50 hover:bg-primary/5',
                        'text-muted-foreground',
                        isUploadingImage && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-sm">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6" />
                          <span className="text-sm">Click to select an image</span>
                          <span className="text-xs text-muted-foreground/70">Max 5MB</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {imageInputMode === 'url' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImage();
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleAddImage} disabled={!imageUrl.trim()}>
                      Add
                    </Button>
                  </div>
                )}

                {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowImageInput(!showImageInput)}
            className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
            title="Add image"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          <div className="relative">
            <Button
              ref={emojiButtonRef}
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
              title="Add emoji"
            >
              <Smile className="h-5 w-5" />
            </Button>

            {showEmojiPicker && (
              <div className="absolute left-0 top-full z-50 mt-2">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  emojiStyle={'native' as unknown as import('emoji-picker-react').EmojiStyle}
                  lazyLoadEmojis={true}
                />
              </div>
            )}
          </div>

          <div className="relative" data-gif-picker>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowGifPicker(!showGifPicker);
                if (!showGifPicker) loadTrendingGifs();
              }}
              className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
              title="Add GIF"
            >
              <Film className="h-5 w-5" />
            </Button>

            {showGifPicker && (
              <div className="absolute left-0 top-full z-50 mt-2 max-h-96 w-80 overflow-hidden rounded-lg border bg-card shadow-lg">
                <div className="border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={gifSearchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGifSearchQuery(value);
                        if (gifSearchTimeoutRef.current) clearTimeout(gifSearchTimeoutRef.current);
                        gifSearchTimeoutRef.current = setTimeout(() => {
                          searchGifs(value);
                        }, 300);
                      }}
                      placeholder="Search GIFs..."
                      className="w-full rounded-md bg-muted py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-2">
                  {isLoadingGifs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : gifError ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {gifError}
                      <button
                        type="button"
                        onClick={loadTrendingGifs}
                        className="mt-2 block w-full text-primary hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : gifResults.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {gifSearchQuery ? 'No GIFs found' : 'Search for GIFs'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {gifResults.map((gif) => (
                        <button
                          key={gif.id}
                          type="button"
                          onClick={() => handleGifSelect(gif)}
                          className="relative aspect-square overflow-hidden rounded transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={gif.images.fixed_height_small?.url || gif.images.preview_gif?.url}
                            alt={gif.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t bg-muted/50 px-2 py-1.5 text-center">
                  <a
                    href="https://giphy.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Powered by GIPHY
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSportPicker(!showSportPicker)}
              className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
              title="Tag sport"
            >
              <MapPin className="h-5 w-5" />
            </Button>

            {showSportPicker && (
              <div className="absolute left-0 top-full z-50 mt-2 max-h-60 w-48 overflow-y-auto rounded-lg border bg-card p-2 shadow-lg">
                {SPORT_CATEGORIES.map((sport) => (
                  <button
                    key={sport.id}
                    onClick={() => {
                      setSportCategory(sport.id);
                      setShowSportPicker(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
                      'transition-colors hover:bg-muted',
                      sportCategory === sport.id && 'bg-primary/10 text-primary'
                    )}
                  >
                    <span>{sport.icon}</span>
                    <span>{sport.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {charCount > 0 && (
              <>
                <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r={circleRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r={circleRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={cn(
                      remainingChars < 0
                        ? 'text-red-500'
                        : remainingChars <= 20
                          ? 'text-yellow-500'
                          : 'text-primary'
                    )}
                  />
                </svg>

                {remainingChars <= 20 && (
                  <span className={cn('text-sm font-medium', getCharCountColor())}>
                    {remainingChars}
                  </span>
                )}
              </>
            )}
          </div>

          {charCount > 0 && <div className="h-6 w-px bg-border" />}

          <Button
            onClick={handlePublish}
            disabled={!canPublish}
            className={cn('px-5 font-semibold', authType !== 'hive' && 'opacity-50')}
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Post
              </>
            )}
          </Button>
        </div>
      </div>

      {authType !== 'hive' && (
        <div className="border-t border-yellow-200 bg-yellow-50 px-4 py-2 dark:border-yellow-800 dark:bg-yellow-950/30">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Connect with Hive Keychain to post sportsbites and earn rewards
          </p>
        </div>
      )}
    </div>
  );
}
