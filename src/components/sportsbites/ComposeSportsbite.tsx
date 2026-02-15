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
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { SPORT_CATEGORIES } from '@/types';
import {
  SPORTSBITES_CONFIG,
  createSportsbiteOperation,
  validateSportsbiteContent,
  Sportsbite,
} from '@/lib/hive-workerbee/sportsbites';
import { createMatchThreadSportsbiteOperation } from '@/lib/hive-workerbee/match-threads';
import { createCommentOptionsOperation } from '@/lib/hive-workerbee/wax-helpers';
import { uploadImage } from '@/lib/hive/imageUpload';
import { validateImageUrl } from '@/lib/utils/sanitize';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { GifPicker } from '@/components/gif/GifPicker';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface ComposeSportsbiteProps {
  onSuccess?: (bite: Sportsbite) => void;
  onError?: (error: string) => void;
  matchThreadEventId?: string;
}

export function ComposeSportsbite({
  onSuccess,
  onError,
  matchThreadEventId,
}: ComposeSportsbiteProps) {
  const { user, authType, hiveUser, touchSession } = useAuth();
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      logger.error('Image upload error', 'ComposeSportsbite', error);
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

  const handleRemoveGif = (index: number) => {
    setGifs(gifs.filter((_, i) => i !== index));
  };

  const handlePublish = useCallback(async () => {
    if (!user) {
      onError?.('Please sign in to post sportsbites');
      return;
    }

    const validation = validateSportsbiteContent(content);
    if (!validation.isValid) {
      onError?.(validation.errors.join(', '));
      return;
    }

    setIsPublishing(true);
    touchSession();

    try {
      if (authType === 'hive' && hiveUser?.username) {
        // HIVE USER: Publish to blockchain
        const ensureUrl = matchThreadEventId
          ? `/api/match-threads/${matchThreadEventId}/ensure`
          : '/api/hive/sportsbites/ensure-container';
        const ensureRes = await fetch(ensureUrl, { method: 'POST' });
        const ensureData = await ensureRes.json();
        if (!ensureData.success) {
          throw new Error(ensureData.error || 'Failed to prepare container');
        }

        const operation = matchThreadEventId
          ? createMatchThreadSportsbiteOperation({
              body: content,
              author: hiveUser.username,
              sportCategory: sportCategory || undefined,
              images: images.length > 0 ? images : undefined,
              gifs: gifs.length > 0 ? gifs : undefined,
              eventId: matchThreadEventId,
            })
          : createSportsbiteOperation({
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

        const commentOptionsOp = createCommentOptionsOperation({
          author: hiveUser.username,
          permlink: operation.permlink,
        });

        const result = await aiohaInstance.signAndBroadcastTx(
          [
            ['comment', operation],
            ['comment_options', commentOptionsOp],
          ],
          'posting'
        );

        if (!result || (result as { error?: string }).error) {
          throw new Error((result as { error?: string }).error || 'Failed to broadcast');
        }

        // Build optimistic sportsbite for immediate display
        const optimisticBite: Sportsbite = {
          id: `${hiveUser.username}/${operation.permlink}`,
          author: hiveUser.username,
          permlink: operation.permlink,
          body: content,
          created: new Date().toISOString(),
          net_votes: 0,
          children: 0,
          pending_payout_value: '0.000 HBD',
          active_votes: [],
          sportCategory: sportCategory || undefined,
          images: images.length > 0 ? images : undefined,
          gifs: gifs.length > 0 ? gifs : undefined,
          source: 'hive',
        };

        setContent('');
        setImages([]);
        setGifs([]);
        setSportCategory('');
        onSuccess?.(optimisticBite);
      } else if (user?.isHiveAuth || user?.hiveUsername) {
        // DEFENSIVE: Hive user whose session state has degraded — don't silently post off-chain
        throw new Error(
          'Your Hive session has expired. Please reconnect your Hive wallet to post on-chain.'
        );
      } else {
        // SOFT USER: Publish to Firebase
        const response = await fetch('/api/soft/sportsbites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            body: content,
            sportCategory: sportCategory || undefined,
            images: images.length > 0 ? images : undefined,
            gifs: gifs.length > 0 ? gifs : undefined,
            matchThreadId: matchThreadEventId || undefined,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || data.message || 'Failed to post sportsbite');
        }

        // Build optimistic sportsbite from API response
        const softBite = data.sportsbite;
        const optimisticBite: Sportsbite = {
          id: `soft-${softBite.id}`,
          author: softBite.authorUsername || user.username || '',
          permlink: `soft-${softBite.id}`,
          body: content,
          created: new Date().toISOString(),
          net_votes: 0,
          children: 0,
          pending_payout_value: '0.000 HBD',
          active_votes: [],
          sportCategory: sportCategory || undefined,
          images: images.length > 0 ? images : undefined,
          gifs: gifs.length > 0 ? gifs : undefined,
          source: 'soft',
          softId: softBite.id,
          authorDisplayName: user.displayName || user.username,
          authorAvatar: user.avatar,
        };

        setContent('');
        setImages([]);
        setGifs([]);
        setSportCategory('');
        onSuccess?.(optimisticBite);
      }
    } catch (error) {
      logger.error('Error publishing sportsbite', 'ComposeSportsbite', error);
      onError?.(error instanceof Error ? error.message : 'Failed to publish sportsbite');
    } finally {
      setIsPublishing(false);
    }
  }, [
    content,
    images,
    gifs,
    sportCategory,
    user,
    authType,
    hiveUser,
    touchSession,
    matchThreadEventId,
    onSuccess,
    onError,
  ]);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [content]);

  const canPublish = content.trim().length > 0 && remainingChars >= 0 && !!user && !isPublishing;

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

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGifPicker(!showGifPicker)}
              className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
              title="Add GIF"
            >
              <Film className="h-5 w-5" />
            </Button>

            <GifPicker
              isOpen={showGifPicker}
              onClose={() => setShowGifPicker(false)}
              onSelect={(gifUrl) => {
                setGifs([...gifs, gifUrl]);
                setShowGifPicker(false);
              }}
              className="left-0 top-full mt-2"
            />
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
            className={cn('px-5 font-semibold', !user && 'opacity-50')}
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

      {authType !== 'hive' && user && (
        <div className="flex items-center gap-2 border-t border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 dark:border-amber-800/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <Zap className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Upgrade to Hive to earn crypto rewards on your sportsbites
          </p>
        </div>
      )}
    </div>
  );
}
