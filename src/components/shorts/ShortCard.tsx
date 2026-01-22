"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MessageCircle, Bookmark, MapPin, MoreHorizontal, Share2, Repeat2, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { StarVoteButton } from "@/components/StarVoteButton";
import { useToast, toast } from "@/components/ui/Toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useModal } from "@/components/modals/ModalProvider";
import { useBookmarks } from "@/hooks/useBookmarks";
import { cn, formatDate } from "@/lib/utils";
import { formatReputation } from "@/lib/shared/utils";
import { Short, extractMediaFromBody } from "@/lib/hive-workerbee/shorts";
import { SPORT_CATEGORIES } from "@/types";
import { getProxyImageUrl, shouldProxyImage } from "@/lib/utils/image-proxy";
import { isTrustedImageHost } from "@/lib/utils/sanitize";

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
    return combined.filter(img => !failedImages.has(img));
  }, [short.images, short.gifs, bodyImages, failedImages]);

  // Handle image load error
  const handleImageError = (imgUrl: string) => {
    setFailedImages(prev => new Set(prev).add(imgUrl));
  };

  const handleVoteSuccess = () => {
    addToast(toast.success("Vote Cast!", "Your vote has been recorded on the blockchain."));
  };

  const handleVoteError = (error: string) => {
    addToast(toast.error("Vote Failed", error));
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
    ? SPORT_CATEGORIES.find(s => s.id === short.sportCategory)
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
      addToast(toast.success("Copied!", "Link copied to clipboard"));
    }
    setShowShareMenu(false);
  };

  return (
    <article 
      className={cn(
        "bg-card border rounded-xl overflow-hidden",
        "hover:shadow-lg hover:border-primary/20 transition-all duration-300",
        "group relative",
        // New short animation
        isNew && "animate-slide-in-top ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        className
      )}
      onMouseLeave={() => setShowShareMenu(false)}
    >
      {/* New badge for fresh shorts */}
      {isNew && (
        <div className="absolute -top-1 -right-1 z-10">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-lg animate-pulse">
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
              "hover:opacity-80 transition-opacity cursor-pointer",
              isProfileLoading && "animate-pulse"
            )}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleUserProfile}
                className="font-semibold hover:underline cursor-pointer"
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
            <div className="flex items-center gap-1 mt-1">
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
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {shortText}
        </p>

        {/* Images */}
        {allImages.length > 0 && (
          <div className={cn(
            "mt-3 rounded-xl overflow-hidden border",
            allImages.length === 1 ? "grid grid-cols-1" :
            allImages.length === 2 ? "grid grid-cols-2 gap-0.5" :
            allImages.length === 3 ? "grid grid-cols-2 gap-0.5" :
            "grid grid-cols-2 gap-0.5"
          )}>
            {allImages.slice(0, 4).map((img, index) => {
              const isGif = img.toLowerCase().endsWith('.gif');
              const finalUrl = shouldProxyImage(img) ? getProxyImageUrl(img) : img;
              // Use Next.js Image only for trusted hosts (configured in next.config.ts)
              const canUseNextImage = isTrustedImageHost(img) && !isGif;

              return (
                <div
                  key={index}
                  className={cn(
                    "relative overflow-hidden bg-muted",
                    allImages.length === 1 ? "aspect-video" :
                    allImages.length === 3 && index === 0 ? "row-span-2 aspect-square" :
                    "aspect-square"
                  )}
                >
                  {canUseNextImage ? (
                    <Image
                      src={finalUrl}
                      alt={`Image ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover hover:scale-105 transition-transform duration-200"
                      unoptimized={shouldProxyImage(img)}
                      onError={() => handleImageError(img)}
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={finalUrl}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      onError={() => handleImageError(img)}
                    />
                  )}

                  {/* Show count for more images */}
                  {index === 3 && allImages.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        +{allImages.length - 4}
                      </span>
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
            <span className="text-xs text-accent font-medium">
              💰 ${pendingPayout.toFixed(2)} pending
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2 pl-[60px] border-t bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center gap-4">
          {/* Vote */}
          <div className="flex items-center gap-1 group/vote">
            <StarVoteButton
              author={short.author}
              permlink={short.permlink}
              voteCount={short.net_votes || 0}
              onVoteSuccess={handleVoteSuccess}
              onVoteError={handleVoteError}
            />
            <button
              onClick={handleUpvoteList}
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              {short.net_votes || 0}
            </button>
          </div>

          {/* Reply */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReply}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 h-8 px-2 transition-all"
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
              className="flex items-center gap-1.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 h-8 px-2 transition-all"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            {/* Share dropdown */}
            {showShareMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-card border rounded-lg shadow-xl py-1 z-20 min-w-[140px] animate-fade-in">
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Share on X
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
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
            "h-8 w-8 p-0 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 transition-all",
            isBookmarked(bookmarkObj as unknown as Parameters<typeof isBookmarked>[0]) && "text-yellow-500"
          )}
        >
          <Bookmark className={cn("h-4 w-4 transition-transform", isBookmarked(bookmarkObj as unknown as Parameters<typeof isBookmarked>[0]) && "fill-current scale-110")} />
        </Button>
      </div>
    </article>
  );
}
