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
  Trophy,
  Send,
  Link as LinkIcon,
  Film,
  BarChart3,
  Download,
  Plus,
  Minus,
  Target,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { SPORT_CATEGORIES } from '@/types';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { usePlaceStake } from '@/hooks/usePredictionStake';
import {
  SPORTSBITES_CONFIG,
  createSportsbiteOperation,
  validateSportsbiteContent,
  createCommentOptionsOperation,
} from '@/lib/hive-workerbee/shared';
import type { Sportsbite, PollDefinition } from '@/lib/hive-workerbee/shared';
import { PollComposer } from '@/components/sportsbites/PollComposer';
import { createMatchThreadSportsbiteOperation } from '@/lib/hive-workerbee/shared';
import { uploadImage } from '@/lib/hive/imageUpload';
import { validateImageUrl } from '@/lib/utils/sanitize';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { GifPicker } from '@/components/gif/GifPicker';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useTransactionConfirmation } from '@/hooks/useTransactionConfirmation';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface ComposeSportsbiteProps {
  onSuccess?: (bite: Sportsbite | null) => void;
  onError?: (error: string) => void;
  matchThreadEventId?: string;
  /** When true, default to prediction mode and hide the take/prediction toggle */
  predictionOnly?: boolean;
}

export function ComposeSportsbite({
  onSuccess,
  onError,
  matchThreadEventId,
  predictionOnly = false,
}: ComposeSportsbiteProps) {
  const { user, authType, hiveUser, touchSession, logout } = useAuth();
  const { broadcast } = useBroadcast();
  const { confirm: confirmTx } = useTransactionConfirmation();
  const placeStakeMutation = usePlaceStake();
  const [content, setContent] = useState('');

  const hiveUsername =
    hiveUser?.username || user?.hiveUsername || (authType === 'hive' ? user?.username : undefined);
  const avatarUrl = user?.avatar || (hiveUsername ? getHiveAvatarUrl(hiveUsername) : undefined);
  const isHiveAuth = authType === 'hive' && !!hiveUsername;
  const [images, setImages] = useState<string[]>([]);
  const [sportCategory, setSportCategory] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [gifs, setGifs] = useState<string[]>([]);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [poll, setPoll] = useState<PollDefinition | null>(null);

  // Prediction compose state
  const [composeMode, setComposeMode] = useState<'take' | 'prediction'>(
    predictionOnly ? 'prediction' : 'take'
  );
  const [predictionTitle, setPredictionTitle] = useState('');
  const [predictionOutcomes, setPredictionOutcomes] = useState<string[]>(['', '']);
  const [predictionLocksAt, setPredictionLocksAt] = useState('');
  const [predictionSportCategory, setPredictionSportCategory] = useState('');
  const [creatorStakeOutcome, setCreatorStakeOutcome] = useState(0);
  const [creatorStakeAmount, setCreatorStakeAmount] = useState<number>(
    PREDICTION_CONFIG.MIN_CREATOR_STAKE
  );
  const [showPredictionSportPicker, setShowPredictionSportPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;
  const maxChars = SPORTSBITES_CONFIG.MAX_CHARS;
  const remainingChars = maxChars - charCount;
  const charPercentage = (charCount / maxChars) * 100;

  const getCharCountColor = () => {
    if (remainingChars < 0) return 'text-destructive';
    if (remainingChars <= 20) return 'text-warning';
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
      if (hiveUser?.username) {
        // ON-CHAIN: Publish to blockchain (Hive wallet users sign via wallet, custodial users sign via relay)
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
              poll: poll || undefined,
            });

        const commentOptionsOp = createCommentOptionsOperation({
          author: hiveUser.username,
          permlink: operation.permlink,
        });

        const result = await broadcast(
          [
            ['comment', operation],
            ['comment_options', commentOptionsOp],
          ],
          'posting'
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to broadcast');
        }

        // Fire-and-forget: poll for block confirmation
        if (result.transactionId) {
          confirmTx(result.transactionId);
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
          poll: poll || undefined,
        };

        setContent('');
        setImages([]);
        setGifs([]);
        setSportCategory('');
        setPoll(null);
        onSuccess?.(optimisticBite);
      } else if (authType === 'hive' && !hiveUser?.username) {
        // DEFENSIVE: Hive wallet user whose session state has degraded — force clean logout
        await logout();
        onError?.('Your Hive session was invalid. Please sign in again.');
        return;
      } else {
        // FALLBACK: User without a Hive account — publish to database
        const response = await fetch('/api/soft/sportsbites', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: content,
            sportCategory: sportCategory || undefined,
            images: images.length > 0 ? images : undefined,
            gifs: gifs.length > 0 ? gifs : undefined,
            matchThreadId: matchThreadEventId || undefined,
            poll: poll || undefined,
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
          poll: poll || undefined,
        };

        setContent('');
        setImages([]);
        setGifs([]);
        setSportCategory('');
        setPoll(null);
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
    poll,
    user,
    authType,
    hiveUser,
    broadcast,
    confirmTx,
    touchSession,
    logout,
    matchThreadEventId,
    onSuccess,
    onError,
  ]);

  const handlePublishPrediction = useCallback(async () => {
    if (!user || !hiveUsername) {
      onError?.('Please sign in with a Hive wallet to create predictions');
      return;
    }

    // Validate
    if (!predictionTitle.trim()) {
      onError?.('Prediction title is required');
      return;
    }
    if (predictionTitle.length > PREDICTION_CONFIG.MAX_TITLE_LENGTH) {
      onError?.(`Title must be under ${PREDICTION_CONFIG.MAX_TITLE_LENGTH} characters`);
      return;
    }
    const validOutcomes = predictionOutcomes.filter((o) => o.trim().length > 0);
    if (validOutcomes.length < PREDICTION_CONFIG.MIN_OUTCOMES) {
      onError?.(`At least ${PREDICTION_CONFIG.MIN_OUTCOMES} outcomes are required`);
      return;
    }
    if (!predictionLocksAt) {
      onError?.('Lock time is required');
      return;
    }
    const locksAtDate = new Date(predictionLocksAt);
    if (locksAtDate.getTime() <= Date.now() + PREDICTION_CONFIG.MIN_LOCK_TIME_MS) {
      onError?.('Lock time must be at least 15 minutes in the future');
      return;
    }
    if (creatorStakeAmount < PREDICTION_CONFIG.MIN_CREATOR_STAKE) {
      onError?.(`Creator stake must be at least ${PREDICTION_CONFIG.MIN_CREATOR_STAKE} MEDALS`);
      return;
    }

    setIsPublishing(true);
    touchSession();

    try {
      // Step 1: Create prediction via API
      const createRes = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: predictionTitle.trim(),
          outcomes: validOutcomes.map((o) => o.trim()),
          sportCategory: predictionSportCategory || undefined,
          locksAt: locksAtDate.toISOString(),
          creatorStake: {
            outcomeIndex: creatorStakeOutcome,
            amount: creatorStakeAmount,
          },
        }),
      });

      const createData = await createRes.json();
      if (!createData.success) {
        const errMsg =
          typeof createData.error === 'string' ? createData.error : createData.error?.message;
        throw new Error(errMsg || 'Failed to create prediction');
      }

      const prediction = createData.data?.prediction;
      if (!prediction) {
        throw new Error('No prediction returned');
      }

      // Step 2: Place creator's initial stake (if the API doesn't handle it automatically)
      if (createData.data?.stakeRequired && prediction.outcomes[creatorStakeOutcome]) {
        try {
          await placeStakeMutation.mutateAsync({
            predictionId: prediction.id,
            outcomeId: prediction.outcomes[creatorStakeOutcome].id,
            amount: creatorStakeAmount,
          });
        } catch (stakeErr) {
          logger.error('Creator stake failed', 'ComposeSportsbite', stakeErr);
          // Prediction was created but stake failed - still count as success
          onError?.('Prediction created but initial stake failed. You can stake separately.');
        }
      }

      // Reset prediction form
      setPredictionTitle('');
      setPredictionOutcomes(['', '']);
      setPredictionLocksAt('');
      setPredictionSportCategory('');
      setCreatorStakeOutcome(0);
      setCreatorStakeAmount(PREDICTION_CONFIG.MIN_CREATOR_STAKE);
      setComposeMode('take');

      // No optimistic bite for predictions — they'll appear via feed refetch
      onSuccess?.(null);
    } catch (error) {
      logger.error('Error creating prediction', 'ComposeSportsbite', error);
      onError?.(error instanceof Error ? error.message : 'Failed to create prediction');
    } finally {
      setIsPublishing(false);
    }
  }, [
    user,
    hiveUsername,
    predictionTitle,
    predictionOutcomes,
    predictionLocksAt,
    predictionSportCategory,
    creatorStakeOutcome,
    creatorStakeAmount,
    touchSession,
    placeStakeMutation,
    onSuccess,
    onError,
  ]);

  // Prediction outcome helpers
  const addOutcome = () => {
    if (predictionOutcomes.length < PREDICTION_CONFIG.MAX_OUTCOMES) {
      setPredictionOutcomes([...predictionOutcomes, '']);
    }
  };

  const removeOutcome = (index: number) => {
    if (predictionOutcomes.length > PREDICTION_CONFIG.MIN_OUTCOMES) {
      const updated = predictionOutcomes.filter((_, i) => i !== index);
      setPredictionOutcomes(updated);
      if (creatorStakeOutcome >= updated.length) {
        setCreatorStakeOutcome(0);
      }
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const updated = [...predictionOutcomes];
    updated[index] = value.slice(0, PREDICTION_CONFIG.MAX_OUTCOME_LABEL_LENGTH);
    setPredictionOutcomes(updated);
  };

  const canPublishPrediction =
    predictionTitle.trim().length > 0 &&
    predictionOutcomes.filter((o) => o.trim().length > 0).length >=
      PREDICTION_CONFIG.MIN_OUTCOMES &&
    predictionLocksAt &&
    creatorStakeAmount >= PREDICTION_CONFIG.MIN_CREATOR_STAKE &&
    !isPublishing;

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

  const isPollValid =
    !poll ||
    (poll.question.trim().length > 0 &&
      poll.options[0].trim().length > 0 &&
      poll.options[1].trim().length > 0);
  const canPublish =
    content.trim().length > 0 && remainingChars >= 0 && !!user && !isPublishing && isPollValid;

  if (!user) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-muted-foreground">Sign in to post sportsbites</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* Prediction compose mode (only when predictionOnly prop is set) */}
      {composeMode === 'prediction' && isHiveAuth ? (
        <div className="space-y-4 p-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Prediction title
            </label>
            <input
              type="text"
              value={predictionTitle}
              onChange={(e) =>
                setPredictionTitle(e.target.value.slice(0, PREDICTION_CONFIG.MAX_TITLE_LENGTH))
              }
              placeholder="e.g. Who will win the match?"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
              disabled={isPublishing}
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {predictionTitle.length}/{PREDICTION_CONFIG.MAX_TITLE_LENGTH}
            </div>
          </div>

          {/* Outcomes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Outcomes ({predictionOutcomes.length}/{PREDICTION_CONFIG.MAX_OUTCOMES})
            </label>
            <div className="space-y-2">
              {predictionOutcomes.map((outcome, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => updateOutcome(i, e.target.value)}
                    placeholder={`Outcome ${i + 1}`}
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
                    disabled={isPublishing}
                  />
                  {predictionOutcomes.length > PREDICTION_CONFIG.MIN_OUTCOMES && (
                    <button
                      type="button"
                      onClick={() => removeOutcome(i)}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {predictionOutcomes.length < PREDICTION_CONFIG.MAX_OUTCOMES && (
              <button
                type="button"
                onClick={addOutcome}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning transition-colors hover:text-warning/80"
              >
                <Plus className="h-3.5 w-3.5" />
                Add outcome
              </button>
            )}
          </div>

          {/* Sport category */}
          <div className="relative">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Sport category
            </label>
            <button
              type="button"
              onClick={() => setShowPredictionSportPicker(!showPredictionSportPicker)}
              className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {predictionSportCategory ? (
                <span className="flex items-center gap-1.5">
                  {SPORT_CATEGORIES.find((s) => s.id === predictionSportCategory)?.icon}
                  {SPORT_CATEGORIES.find((s) => s.id === predictionSportCategory)?.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Select sport (optional)</span>
              )}
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </button>
            {showPredictionSportPicker && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-card p-1.5 shadow-lg">
                {SPORT_CATEGORIES.map((sport) => (
                  <button
                    key={sport.id}
                    onClick={() => {
                      setPredictionSportCategory(sport.id);
                      setShowPredictionSportPicker(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                      predictionSportCategory === sport.id && 'bg-amber-500/10 text-amber-600'
                    )}
                  >
                    <span>{sport.icon}</span>
                    <span>{sport.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lock time */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Locks at
            </label>
            <input
              type="datetime-local"
              value={predictionLocksAt}
              onChange={(e) => setPredictionLocksAt(e.target.value)}
              min={new Date(Date.now() + PREDICTION_CONFIG.MIN_LOCK_TIME_MS)
                .toISOString()
                .slice(0, 16)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
              disabled={isPublishing}
            />
          </div>

          {/* Creator's initial stake */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Your initial stake
            </label>
            {/* Pick outcome */}
            <div className="mb-2 space-y-1.5">
              {predictionOutcomes.map(
                (outcome, i) =>
                  outcome.trim() && (
                    <label
                      key={i}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                        creatorStakeOutcome === i
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <input
                        type="radio"
                        name="creatorStakeOutcome"
                        checked={creatorStakeOutcome === i}
                        onChange={() => setCreatorStakeOutcome(i)}
                        className="accent-amber-500"
                      />
                      <span>{outcome}</span>
                    </label>
                  )
              )}
            </div>
            {/* Stake amount quick buttons */}
            <div className="flex gap-2">
              {([25, 50, 100, 250] as const).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCreatorStakeAmount(amt)}
                  className={cn(
                    'flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors',
                    creatorStakeAmount === amt
                      ? 'bg-amber-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {amt}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={creatorStakeAmount}
              onChange={(e) => setCreatorStakeAmount(Math.max(0, parseInt(e.target.value) || 0))}
              min={PREDICTION_CONFIG.MIN_CREATOR_STAKE}
              max={PREDICTION_CONFIG.MAX_STAKE}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
              disabled={isPublishing}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Min: {PREDICTION_CONFIG.MIN_CREATOR_STAKE} MEDALS
            </p>
          </div>

          {/* Publish button */}
          <Button
            onClick={handlePublishPrediction}
            disabled={!canPublishPrediction}
            className="w-full bg-amber-500 font-semibold text-white hover:bg-amber-600"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Create Prediction
              </>
            )}
          </Button>
        </div>
      ) : (
        /* Take compose mode (existing) */
        <>
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
                        <img
                          src={gif}
                          alt={`GIF ${index + 1}`}
                          className="h-24 w-24 object-cover"
                        />
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
                      <Trophy className="h-3 w-3" />
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

                {poll && <PollComposer poll={poll} onChange={(p) => setPoll(p)} className="mt-3" />}

                {showImageInput && (
                  <div className="mt-3 rounded-lg border bg-muted/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Add image from URL
                      </span>
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
                        autoFocus
                      />
                      <Button size="sm" onClick={handleAddImage} disabled={!imageUrl.trim()}>
                        Add
                      </Button>
                    </div>
                    {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
                  </div>
                )}

                {uploadError && !showImageInput && (
                  <p className="mt-2 text-sm text-destructive">{uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-1">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                title="Upload image"
              >
                {isUploadingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImageInput(!showImageInput)}
                className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
                title="Add image from URL"
              >
                <LinkIcon className="h-5 w-5" />
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
                  <Trophy className="h-5 w-5" />
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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPoll(poll ? null : { question: '', options: ['', ''] })}
                className={cn(
                  'h-9 w-9 p-0 hover:bg-primary/10',
                  poll ? 'text-primary' : 'text-primary'
                )}
                title={poll ? 'Remove poll' : 'Add poll'}
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {charCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {content.trim().split(/\s+/).filter(Boolean).length}w
                </span>
              )}

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
                            ? 'text-destructive'
                            : remainingChars <= 20
                              ? 'text-warning'
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

          {authType === 'soft' && user && !user.keysDownloaded && (
            <a
              href="/api/hive/download-keys"
              className="flex items-center gap-2 border-t border-warning/30 bg-warning/10 px-4 py-2.5 transition-colors hover:bg-warning/15"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-warning" />
              <p className="text-xs font-medium text-warning">
                Download your Hive keys for full self-custody of your account
              </p>
            </a>
          )}
        </>
      )}
    </div>
  );
}
