'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  MessageCircle,
  Bookmark,
  MapPin,
  MoreHorizontal,
  Share2,
  Repeat2,
  ExternalLink,
} from 'lucide-react';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { StarVoteButton } from '@/components/voting/StarVoteButton';
import { useToast, toast } from '@/components/core/Toast';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { useModal } from '@/components/modals/ModalProvider';
import { useBookmarks } from '@/hooks/useBookmarks';
import { cn, formatDate } from '@/lib/utils/client';
import { formatReputation } from '@/lib/utils/hive';
import { Short, extractMediaFromBody } from '@/lib/hive-workerbee/shorts';
import { SPORT_CATEGORIES } from '@/types';
import { getProxyImageUrl, shouldProxyImage } from '@/lib/utils/image-proxy';
import { isTrustedImageHost } from '@/lib/utils/sanitize';

interface ShortCardProps {
  short: Short;
  className?: string;
  isNew?: boolean; // Animation for new shorts
}

export function ShortCard({ short, className, isNew = false }: ShortCardProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const { addToast } = useToast();
  const { openModal } = useModal();
  const { toggleBookmark, isBookmarked } = useBookmarks();

  // Fetch author profile
  const { profile: authorProfile, isLoading: isProfileLoading } = useUserProfile(short.author);

  // Extract text and images from body
  const { text: shortText, images: bodyImages } = React.useMemo(
    () => extractMediaFromBody(short.body),
    [short.body]
  );

  // Combine images from metadata and body, filtering out failed ones
  const allImages = React.useMemo(() => {
    const metadataImages = short.images || [];
    const gifs = short.gifs || [];
    const combined = [...new Set([...metadataImages, ...gifs, ...bodyImages])];
    // Filter out images that failed to load
    return combined.filter((img) => !failedImages.has(img));
  }, [short.images, short.gifs, bodyImages, failedImages]);

  // Handle image load error
  const handleImageError = (imgUrl: string) => {
    setFailedImages((prev) => new Set(prev).add(imgUrl));
  };

  const handleVoteSuccess = () => {
    addToast(toast.success('Vote Cast!', 'Your vote has been recorded on the blockchain.'));
  };

  const handleVoteError = (error: string) => {
    addToast(toast.error('Vote Failed', error));
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a post-like object for the bookmark system
    // Cast to unknown first to bypass strict type checking for partial SportsblockPost
    const postLike = {
      postType: 'sportsblock',
      id: 0, // Using 0 as placeholder since shorts don't have numeric IDs
      author: short.author,
      permlink: short.permlink,
      title: shortText.substring(0, 50) + (shortText.length > 50 ? '...' : ''),
      body: short.body,
      created: short.created,
      last_update: short.created,
      depth: 1,
      children: short.children,
      net_votes: short.net_votes,
      active_votes: short.active_votes,
      pending_payout_value: short.pending_payout_value,
      total_pending_payout_value: short.pending_payout_value,
      curator_payout_value: '0 HBD',
      author_payout_value: '0 HBD',
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10000,
      allow_votes: true,
      allow_curation_rewards: true,
      json_metadata: '{}',
      parent_author: '',
      parent_permlink: '',
      isSportsblockPost: true,
    } as const;
    toggleBookmark(postLike as unknown as Parameters<typeof toggleBookmark>[0]);
  };

  const handleReply = () => {
    openModal('comments', {
      author: short.author,
      permlink: short.permlink,
    });
  };

  const handleUpvoteList = () => {
    openModal('upvoteList', {
      author: short.author,
      permlink: short.permlink,
      voteCount: short.net_votes || 0,
    });
  };

  const handleUserProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/user/${short.author}`;
  };

  // Format pending payout
  const pendingPayout = React.useMemo(() => {
    if (!short.pending_payout_value) return 0;
    const valueStr = short.pending_payout_value.replace(' HBD', '').replace(' HIVE', '');
    return parseFloat(valueStr);
  }, [short.pending_payout_value]);

  // Get sport category info
  const sportInfo = short.sportCategory
    ? SPORT_CATEGORIES.find((s) => s.id === short.sportCategory)
    : null;

  // Bookmark compatible object - create a minimal SportsblockPost-like object
  const bookmarkObj = {
    postType: 'sportsblock' as const,
    id: 0,
    author: short.author,
    permlink: short.permlink,
    title: shortText.substring(0, 50),
    body: short.body,
    created: short.created,
    last_update: short.created,
    depth: 1,
    children: short.children,
    net_votes: short.net_votes,
    active_votes: short.active_votes,
    pending_payout_value: short.pending_payout_value,
    total_pending_payout_value: short.pending_payout_value,
    curator_payout_value: '0 HBD',
    author_payout_value: '0 HBD',
    max_accepted_payout: '1000000.000 HBD',
    percent_hbd: 10000,
    allow_votes: true,
    allow_curation_rewards: true,
    json_metadata: '{}',
    parent_author: '',
    parent_permlink: '',
    isSportsblockPost: true as const,
  };

  // Share functionality
  const handleShare = async (platform?: 'twitter' | 'copy') => {
    const shortUrl = `https://sportsblock.io/@${short.author}/${short.permlink}`;
    const text = shortText.substring(0, 200);

    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shortUrl)}`,
        '_blank'
      );
    } else if (platform === 'copy') {
      await navigator.clipboard.writeText(shortUrl);
      addToast(toast.success('Copied!', 'Link copied to clipboard'));
    }
    setShowShareMenu(false);
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-card',
        'transition-all duration-300 hover:border-primary/20 hover:shadow-lg',
        'group relative',
        // New short animation
        isNew && 'animate-slide-in-top ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
        className
      )}
      onMouseLeave={() => setShowShareMenu(false)}
    >
      {/* New badge for fresh shorts */}
      {isNew && (
        <div className="absolute -right-1 -top-1 z-10">
          <span className="inline-flex animate-pulse items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-lg">
            NEW
          </span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <button onClick={handleUserProfile} className="flex-shrink-0">
          <Avatar
            src={authorProfile?.avatar}
            fallback={short.author}
            alt={authorProfile?.displayName || short.author}
            size="md"
            className={cn(
              'cursor-pointer transition-opacity hover:opacity-80',
              isProfileLoading && 'animate-pulse'
            )}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleUserProfile}
                className="cursor-pointer font-semibold hover:underline"
              >
                {authorProfile?.displayName || short.author}
              </button>
              <span className="text-muted-foreground">@{short.author}</span>
              {short.author_reputation && (
                <span className="text-xs text-muted-foreground">
                  ({formatReputation(parseFloat(short.author_reputation) || 0)})
                </span>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(new Date(short.created + 'Z'))}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Sport category badge */}
          {sportInfo && (
            <div className="mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {sportInfo.icon} {sportInfo.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 pl-[60px]">
        {/* Text content */}
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{shortText}</p>

        {/* Images */}
        {allImages.length > 0 && (
          <div
            className={cn(
              'mt-3 overflow-hidden rounded-xl border',
              allImages.length === 1
                ? 'grid grid-cols-1'
                : allImages.length === 2
                  ? 'grid grid-cols-2 gap-0.5'
                  : allImages.length === 3
                    ? 'grid grid-cols-2 gap-0.5'
                    : 'grid grid-cols-2 gap-0.5'
            )}
          >
            {allImages.slice(0, 4).map((img, index) => {
              const isGif = img.toLowerCase().endsWith('.gif');
              const finalUrl = shouldProxyImage(img) ? getProxyImageUrl(img) : img;
              // Use Next.js Image only for trusted hosts (configured in next.config.ts)
              const canUseNextImage = isTrustedImageHost(img) && !isGif;

              return (
                <div
                  key={index}
                  className={cn(
                    'relative overflow-hidden bg-muted',
                    allImages.length === 1
                      ? 'aspect-video'
                      : allImages.length === 3 && index === 0
                        ? 'row-span-2 aspect-square'
                        : 'aspect-square'
                  )}
                >
                  {canUseNextImage ? (
                    <Image
                      src={finalUrl}
                      alt={`Image ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover transition-transform duration-200 hover:scale-105"
                      unoptimized={shouldProxyImage(img)}
                      onError={() => handleImageError(img)}
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={finalUrl}
                      alt={`Image ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                      onError={() => handleImageError(img)}
                    />
                  )}

                  {/* Show count for more images */}
                  {index === 3 && allImages.length > 4 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-xl font-bold text-white">+{allImages.length - 4}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pending payout */}
        {pendingPayout > 0 && (
          <div className="mt-2">
            <span className="text-xs font-medium text-accent">
              💰 ${pendingPayout.toFixed(2)} pending
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t bg-gradient-to-r from-muted/30 to-transparent px-4 py-2 pl-[60px]">
        <div className="flex items-center gap-4">
          {/* Vote */}
          <div className="group/vote flex items-center gap-1">
            <StarVoteButton
              author={short.author}
              permlink={short.permlink}
              voteCount={short.net_votes || 0}
              onVoteSuccess={handleVoteSuccess}
              onVoteError={handleVoteError}
            />
            <button
              onClick={handleUpvoteList}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {short.net_votes || 0}
            </button>
          </div>

          {/* Reply */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReply}
            className="flex h-8 items-center gap-1.5 px-2 text-muted-foreground transition-all hover:bg-accent/10 hover:text-accent"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{short.children || 0}</span>
          </Button>

          {/* Share */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex h-8 items-center gap-1.5 px-2 text-muted-foreground transition-all hover:bg-green-500/10 hover:text-green-500"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            {/* Share dropdown */}
            {showShareMenu && (
              <div className="absolute bottom-full left-0 z-20 mb-2 min-w-[140px] animate-fade-in rounded-lg border bg-card py-1 shadow-xl">
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                  Share on X
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <Repeat2 className="h-4 w-4" />
                  Copy link
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bookmark */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmark}
          className={cn(
            'h-8 w-8 p-0 text-muted-foreground transition-all hover:bg-yellow-500/10 hover:text-yellow-500',
            isBookmarked(bookmarkObj as unknown as Parameters<typeof isBookmarked>[0]) &&
              'text-yellow-500'
          )}
        >
          <Bookmark
            className={cn(
              'h-4 w-4 transition-transform',
              isBookmarked(bookmarkObj as unknown as Parameters<typeof isBookmarked>[0]) &&
                'scale-110 fill-current'
            )}
          />
        </Button>
      </div>
    </article>
  );
}
