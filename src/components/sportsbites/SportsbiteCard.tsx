'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MessageCircle,
  Bookmark,
  MapPin,
  MoreHorizontal,
  Share2,
  Repeat2,
  ExternalLink,
  Trash2,
  Users,
  Coins,
} from 'lucide-react';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { StarVoteButton } from '@/components/voting/StarVoteButton';
import { SoftLikeButton } from '@/components/voting/SoftLikeButton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, toast } from '@/components/core/Toast';
import { useUserProfileCard } from '@/lib/react-query/queries/useUserProfile';
import { useModal } from '@/components/modals/ModalProvider';
import { useBookmarks } from '@/hooks/useBookmarks';
import { cn, formatDate } from '@/lib/utils/client';
import { extractMediaFromBody } from '@/lib/hive-workerbee/shared';
import type {
  Sportsbite,
  ReactionEmoji,
  ReactionCounts,
  PollResults,
} from '@/lib/hive-workerbee/shared';
import { SPORT_CATEGORIES } from '@/types';
import { getProxyImageUrl, shouldProxyImage, proxyImagesInContent } from '@/lib/utils/image-proxy';
import { isTrustedImageHost, sanitizePostContent } from '@/lib/utils/sanitize';
import { linkifyHashtags } from '@/lib/utils/hashtags';
import { InlineReplies } from '@/components/sportsbites/InlineReplies';
import { useBroadcast } from '@/hooks/useBroadcast';
import { EmojiReactions } from '@/components/sportsbites/EmojiReactions';
import { RoleBadge } from '@/components/user/RoleBadge';
import { QuickPoll } from '@/components/sportsbites/QuickPoll';
import { TipButton } from '@/components/sportsbites/TipButton';

interface SportsbiteCardProps {
  sportsbite: Sportsbite;
  className?: string;
  isNew?: boolean;
  onDelete?: (id: string) => void;
  initialReactionCounts?: ReactionCounts;
  initialUserReaction?: ReactionEmoji | null;
  initialPollResults?: PollResults;
  initialPollUserVote?: 0 | 1 | null;
}

export const SportsbiteCard = React.memo(function SportsbiteCard({
  sportsbite,
  className,
  isNew = false,
  onDelete,
  initialReactionCounts,
  initialUserReaction,
  initialPollResults,
  initialPollUserVote,
}: SportsbiteCardProps) {
  const router = useRouter();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [showReplies, setShowReplies] = useState(false);
  const { authType, hiveUser, user } = useAuth();
  const { addToast } = useToast();
  const { openModal } = useModal();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const { broadcast } = useBroadcast();

  const { profile: authorProfile, isLoading: isProfileLoading } = useUserProfileCard(
    sportsbite.author
  );

  const { text: biteText, images: bodyImages } = React.useMemo(
    () => extractMediaFromBody(sportsbite.body),
    [sportsbite.body]
  );

  const biteHtml = React.useMemo(
    () => linkifyHashtags(proxyImagesInContent(sanitizePostContent(biteText))),
    [biteText]
  );

  const allImages = React.useMemo(() => {
    const metadataImages = sportsbite.images || [];
    const gifs = sportsbite.gifs || [];
    // Prefer metadata images (canonical source). Only fall back to body-extracted
    // images for legacy or third-party posts that lack metadata.
    const imgs = metadataImages.length > 0 ? metadataImages : bodyImages;
    const combined = [...new Set([...imgs, ...gifs])];
    return combined.filter((img) => !failedImages.has(img));
  }, [sportsbite.images, sportsbite.gifs, bodyImages, failedImages]);

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
    const postLike = {
      postType: 'sportsblock' as const,
      id: 0,
      author: sportsbite.author,
      permlink: sportsbite.permlink,
      title: biteText.substring(0, 50) + (biteText.length > 50 ? '...' : ''),
      body: sportsbite.body,
      created: sportsbite.created,
      last_update: sportsbite.created,
      depth: 1,
      children: sportsbite.children,
      net_votes: sportsbite.net_votes,
      active_votes: sportsbite.active_votes,
      pending_payout_value: sportsbite.pending_payout_value,
      total_pending_payout_value: sportsbite.pending_payout_value,
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
    toggleBookmark(postLike as unknown as Parameters<typeof toggleBookmark>[0]);
  };

  const handleUpvoteList = () => {
    openModal('upvoteList', {
      author: sportsbite.author,
      permlink: sportsbite.permlink,
      voteCount: sportsbite.net_votes || 0,
    });
  };

  const handleUserProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/user/${sportsbite.author}`);
  };

  const pendingPayout = React.useMemo(() => {
    if (!sportsbite.pending_payout_value) return 0;
    const valueStr = sportsbite.pending_payout_value.replace(' HBD', '').replace(' HIVE', '');
    return parseFloat(valueStr);
  }, [sportsbite.pending_payout_value]);

  const sportInfo = sportsbite.sportCategory
    ? SPORT_CATEGORIES.find((s) => s.id === sportsbite.sportCategory)
    : null;

  const bookmarkObj = {
    postType: 'sportsblock' as const,
    id: 0,
    author: sportsbite.author,
    permlink: sportsbite.permlink,
    title: biteText.substring(0, 50),
    body: sportsbite.body,
    created: sportsbite.created,
    last_update: sportsbite.created,
    depth: 1,
    children: sportsbite.children,
    net_votes: sportsbite.net_votes,
    active_votes: sportsbite.active_votes,
    pending_payout_value: sportsbite.pending_payout_value,
    total_pending_payout_value: sportsbite.pending_payout_value,
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

  const isOwner =
    (authType === 'hive' && hiveUser?.username === sportsbite.author) ||
    (authType === 'soft' && user?.username === sportsbite.author);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      if (sportsbite.source === 'soft') {
        const res = await fetch('/api/soft/sportsbites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sportsbiteId: sportsbite.softId || sportsbite.permlink }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete sportsbite');
        }
      } else {
        // Try delete_comment first (works if no net votes/replies)
        let deleted = false;
        try {
          const delResult = await broadcast(
            [['delete_comment', { author: sportsbite.author, permlink: sportsbite.permlink }]],
            'posting'
          );
          if (delResult.success) {
            deleted = true;
          }
        } catch {
          // delete_comment fails if the comment has votes/replies — fall through
        }

        // Fallback: overwrite body with '[deleted]'
        if (!deleted) {
          const hiveNode = 'https://api.hive.blog';
          const contentRes = await fetch(hiveNode, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'condenser_api.get_content',
              params: [sportsbite.author, sportsbite.permlink],
              id: 1,
            }),
          });
          const contentData = await contentRes.json();
          const content = contentData.result;
          if (!content || !content.author) {
            throw new Error('Could not fetch sportsbite data from Hive');
          }

          const result = await broadcast(
            [
              [
                'comment',
                {
                  parent_author: content.parent_author,
                  parent_permlink: content.parent_permlink,
                  author: sportsbite.author,
                  permlink: sportsbite.permlink,
                  title: '',
                  body: '[deleted]',
                  json_metadata: JSON.stringify({
                    app: 'sportsblock/1.0.0',
                    tags: ['deleted', 'sportsblock'],
                  }),
                },
              ],
            ],
            'posting'
          );

          if (!result.success) {
            throw new Error(result.error || 'Failed to broadcast delete');
          }
        }
      }

      addToast(toast.success('Deleted', 'Sportsbite has been deleted.'));
      onDelete?.(sportsbite.id);
    } catch (err) {
      addToast(
        toast.error('Delete Failed', err instanceof Error ? err.message : 'Something went wrong')
      );
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
      setShowMoreMenu(false);
    }
  };

  const [isReblogging, setIsReblogging] = useState(false);

  const handleShare = async (platform?: 'twitter' | 'copy') => {
    const biteUrl = `https://sportsblock.app/@${sportsbite.author}/${sportsbite.permlink}`;
    const text = biteText.substring(0, 200);

    if (platform === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(biteUrl)}`,
        '_blank'
      );
    } else if (platform === 'copy') {
      await navigator.clipboard.writeText(biteUrl);
      addToast(toast.success('Copied!', 'Link copied to clipboard'));
    }
    setShowShareMenu(false);
  };

  const handleReblog = async () => {
    if (isReblogging || !hiveUser?.username) return;
    setIsReblogging(true);
    try {
      const { reblogPost } = await import('@/lib/hive-workerbee/social');
      const result = await reblogPost(
        sportsbite.author,
        sportsbite.permlink,
        hiveUser.username,
        broadcast
      );
      if (result.success) {
        addToast(toast.success('Reposted!', 'Reposted to your blog!'));
      } else {
        addToast(toast.error('Reblog Failed', result.error || 'Something went wrong'));
      }
    } catch {
      addToast(toast.error('Reblog Failed', 'Something went wrong'));
    } finally {
      setIsReblogging(false);
      setShowShareMenu(false);
    }
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-card',
        'transition-all duration-300 hover:border-primary/20 hover:shadow-lg',
        'group relative',
        isNew && 'animate-slide-in-top ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
        className
      )}
      onMouseLeave={() => {
        setShowShareMenu(false);
        setShowMoreMenu(false);
        setConfirmingDelete(false);
      }}
    >
      {isNew && (
        <div className="absolute -right-1 -top-1 z-10">
          <span className="inline-flex animate-pulse items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-lg">
            NEW
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2 p-3 pb-0 sm:gap-3 sm:p-4 sm:pb-0">
        <button onClick={handleUserProfile} className="flex-shrink-0">
          <Avatar
            src={authorProfile?.avatar}
            fallback={sportsbite.author}
            alt={authorProfile?.displayName || sportsbite.author}
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
                {authorProfile?.displayName || sportsbite.author}
              </button>
              <span className="text-muted-foreground">@{sportsbite.author}</span>
              <RoleBadge username={sportsbite.author} />
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(
                  new Date(
                    sportsbite.created.endsWith('Z') ? sportsbite.created : sportsbite.created + 'Z'
                  )
                )}
              </span>
            </div>

            {isOwner && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setShowMoreMenu(!showMoreMenu);
                    setConfirmingDelete(false);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] animate-fade-in rounded-lg border bg-card py-1 shadow-xl">
                    {confirmingDelete ? (
                      <div className="px-3 py-2">
                        <p className="mb-2 text-sm font-medium">Are you sure?</p>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleDelete}
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setConfirmingDelete(false)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingDelete(true)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
      <div className="px-3 py-3 sm:px-4 sm:pl-[60px]">
        <div
          className="prose prose-sm max-w-none break-words text-[15px] leading-relaxed dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: biteHtml }}
        />

        {sportsbite.poll && (
          <QuickPoll
            sportsbiteId={sportsbite.id}
            poll={sportsbite.poll}
            initialResults={initialPollResults}
            initialUserVote={initialPollUserVote}
            className="mt-3"
          />
        )}

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
              const canUseNextImage = isTrustedImageHost(img) && !isGif;

              return (
                <div
                  key={img}
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

        {pendingPayout > 0 && sportsbite.source !== 'soft' && (
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs font-medium text-accent">
              ${pendingPayout.toFixed(2)} pending
            </span>
            {(sportsbite.tipTotal ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                <Coins className="h-3 w-3" />
                {sportsbite.tipTotal} MEDALS tipped
              </span>
            )}
          </div>
        )}
        {sportsbite.source !== 'soft' && !pendingPayout && (sportsbite.tipTotal ?? 0) > 0 && (
          <div className="mt-2">
            <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
              <Coins className="h-3 w-3" />
              {sportsbite.tipTotal} MEDALS tipped
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t bg-gradient-to-r from-muted/30 to-transparent px-3 py-2 sm:px-4 sm:pl-[60px]">
        <div className="flex items-center gap-4">
          <div className="group/vote flex items-center gap-1">
            {(authType === 'hive' || authType === 'soft') && sportsbite.source !== 'soft' ? (
              <StarVoteButton
                author={sportsbite.author}
                permlink={sportsbite.permlink}
                voteCount={sportsbite.active_votes?.length || sportsbite.net_votes || 0}
                onVoteSuccess={handleVoteSuccess}
                onVoteError={handleVoteError}
              />
            ) : (
              <SoftLikeButton
                targetType="post"
                targetId={
                  sportsbite.source === 'soft'
                    ? sportsbite.softId || sportsbite.id
                    : `hive-${sportsbite.author}-${sportsbite.permlink}`
                }
                initialLikeCount={sportsbite.net_votes || 0}
              />
            )}
            <button
              onClick={handleUpvoteList}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              title="View voters"
            >
              <Users className="h-3.5 w-3.5" />
              {sportsbite.active_votes?.length || sportsbite.net_votes || 0}
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className={cn(
              'flex h-8 items-center gap-1.5 px-2 transition-all hover:bg-accent/10 hover:text-accent',
              showReplies ? 'text-accent' : 'text-muted-foreground'
            )}
          >
            <MessageCircle className={cn('h-4 w-4', showReplies && 'fill-current')} />
            <span className="text-sm font-medium">{sportsbite.children || 0}</span>
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex h-8 items-center gap-1.5 px-2 text-muted-foreground transition-all hover:bg-green-500/10 hover:text-green-500"
            >
              <Share2 className="h-4 w-4" />
            </Button>

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
                {authType === 'hive' &&
                  sportsbite.source !== 'soft' &&
                  hiveUser?.username !== sportsbite.author && (
                    <button
                      onClick={handleReblog}
                      disabled={isReblogging}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Repeat2 className={cn('h-4 w-4', isReblogging && 'animate-spin')} />
                      {isReblogging ? 'Reposting...' : 'Repost to blog'}
                    </button>
                  )}
              </div>
            )}
          </div>

          {!isOwner && sportsbite.source !== 'soft' && (
            <TipButton author={sportsbite.author} permlink={sportsbite.permlink} />
          )}
        </div>

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

      {/* Emoji Reactions */}
      <div className="border-t px-3 py-1.5 sm:px-4 sm:pl-[60px]">
        <EmojiReactions
          sportsbiteId={sportsbite.id}
          initialCounts={initialReactionCounts}
          initialUserReaction={initialUserReaction}
        />
      </div>

      {showReplies && (
        <InlineReplies
          author={sportsbite.author}
          permlink={sportsbite.permlink}
          source={sportsbite.source}
        />
      )}
    </article>
  );
});
