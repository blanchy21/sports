import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Community } from '@/types';
import { useCommunities, useUserCommunities } from '@/lib/react-query/queries/useCommunity';
import { useUIStore } from '@/stores/uiStore';
import { logger } from '@/lib/logger';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useToast } from '@/components/core/Toast';
import { useTransactionConfirmation } from '@/hooks/useTransactionConfirmation';
import type { RewardsOption, Beneficiary } from '@/components/publish/AdvancedOptions';

// --- Exported types ---

export interface RCStatus {
  canPost: boolean;
  rcPercentage: number;
  message?: string;
}

export interface PostLimitInfo {
  currentCount: number;
  limit: number;
  remaining: number;
  isNearLimit: boolean;
  upgradePrompt: string | null;
}

// --- Hook ---

export function usePublishForm() {
  const auth = useAuth();
  const { user, authType, hiveUser, isLoading: isAuthLoading } = auth;
  const { broadcast } = useBroadcast();
  const { addToast } = useToast();
  const { confirm: confirmTx } = useTransactionConfirmation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [coverImage, setCoverImage] = useState('');
  const [rewardsOption, setRewardsOption] = useState<RewardsOption>('50_50');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { account: 'sportsblock', weight: 5 },
  ]);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAuthorityPrompt, setShowAuthorityPrompt] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [rcStatus, setRcStatus] = useState<RCStatus | null>(null);

  // Draft save tracking
  const [isDraftSaved, setIsDraftSaved] = useState(true);

  // AI-generated image URLs for metadata disclosure
  const [aiGeneratedUrls, setAiGeneratedUrls] = useState<Set<string>>(new Set());

  // Soft user post limit tracking
  const [postLimitInfo, setPostLimitInfo] = useState<PostLimitInfo | null>(null);
  const [showPostPublishedPrompt, setShowPostPublishedPrompt] = useState(false);

  // Refs
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const cursorPositionRef = React.useRef<number>(0);

  // Store
  const { recentTags, addRecentTags } = useUIStore();

  // Fetch communities
  const { data: userCommunities } = useUserCommunities(user?.id || '');
  const { data: allCommunities } = useCommunities({ limit: 50 });

  // Detect images from content
  const detectedImages = useMemo(() => {
    const regex = /!\[.*?\]\((.*?)\)/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1] && !matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  }, [content]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  // Load draft from server
  const loadDraft = useCallback(async (draftId: string) => {
    try {
      const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.draft) {
        setTitle(data.draft.title || '');
        setContent(data.draft.content || '');
        setExcerpt('');
        setSelectedSport(data.draft.sport || '');
        setTags(Array.isArray(data.draft.tags) ? data.draft.tags : []);
        setCoverImage(data.draft.imageUrl || '');
      }
    } catch (err) {
      logger.error('Error loading draft', 'PublishPage', err);
    }
  }, []);

  // Load draft if draft ID is provided
  React.useEffect(() => {
    const draftId = searchParams.get('draft');
    if (draftId && user) {
      loadDraft(draftId);
    }
  }, [searchParams, user, loadDraft]);

  // Pre-select community from URL parameter
  React.useEffect(() => {
    const communitySlug = searchParams.get('community');
    if (communitySlug && !selectedCommunity) {
      const allAvailableCommunities = [
        ...(userCommunities || []),
        ...(allCommunities?.communities || []),
      ];
      const community = allAvailableCommunities.find(
        (c) => c.slug === communitySlug || c.id === communitySlug
      );
      if (community) {
        setSelectedCommunity(community);
      }
    }
  }, [searchParams, userCommunities, allCommunities, selectedCommunity]);

  // Close menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkRCStatus = React.useCallback(async () => {
    if (!hiveUser?.username) return;

    try {
      const res = await fetch(
        `/api/hive/posting?username=${encodeURIComponent(hiveUser.username)}`
      );
      const data = await res.json();
      const status = data.canPost ?? {
        canPost: false,
        rcPercentage: 0,
        message: 'Failed to check RC',
      };
      setRcStatus(status);
    } catch (error) {
      logger.error('Error checking RC status', 'PublishPage', error);
    }
  }, [hiveUser?.username]);

  // Check RC status for Hive users
  React.useEffect(() => {
    if (hiveUser?.username && authType === 'hive') {
      checkRCStatus();
    }
  }, [hiveUser, authType, checkRCStatus]);

  // Mark as unsaved when content changes
  React.useEffect(() => {
    if (title || content) {
      setIsDraftSaved(false);
    }
  }, [title, content]);

  // Auto-grow textarea with content
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [content]);

  // Fetch post count for soft users to show limit warnings
  React.useEffect(() => {
    const fetchPostCount = async () => {
      if (!user?.id || authType === 'hive') return;

      try {
        const response = await fetch(`/api/posts?authorId=${encodeURIComponent(user.id)}`);
        const data = await response.json();
        if (data.success) {
          const currentCount = data.posts?.length || 0;
          const limit = 50;
          const remaining = limit - currentCount;
          setPostLimitInfo({
            currentCount,
            limit,
            remaining,
            isNearLimit: remaining <= 10,
            upgradePrompt:
              remaining <= 10
                ? `You have ${remaining} post${remaining === 1 ? '' : 's'} remaining. Upgrade to Hive for unlimited posts!`
                : null,
          });
        }
      } catch {
        // Silently fail
      }
    };

    fetchPostCount();
  }, [user?.id, authType]);

  return {
    // Auth / dependencies
    user,
    authType,
    hiveUser,
    isAuthLoading,
    broadcast,
    addToast,
    confirmTx,
    router,
    searchParams,

    // Form state
    title,
    setTitle,
    content,
    setContent,
    excerpt,
    setExcerpt,
    tags,
    setTags,
    selectedSport,
    setSelectedSport,
    selectedCommunity,
    setSelectedCommunity,
    coverImage,
    setCoverImage,
    rewardsOption,
    setRewardsOption,
    beneficiaries,
    setBeneficiaries,

    // UI state
    showPreview,
    setShowPreview,
    showImageDialog,
    setShowImageDialog,
    showLinkDialog,
    setShowLinkDialog,
    showScheduleModal,
    setShowScheduleModal,
    showAuthorityPrompt,
    setShowAuthorityPrompt,
    showMenu,
    setShowMenu,
    isPublishing,
    setIsPublishing,
    publishError,
    setPublishError,
    rcStatus,
    isDraftSaved,
    setIsDraftSaved,
    aiGeneratedUrls,
    setAiGeneratedUrls,
    postLimitInfo,
    setPostLimitInfo,
    showPostPublishedPrompt,
    setShowPostPublishedPrompt,

    // Refs
    textareaRef,
    menuRef,
    cursorPositionRef,

    // Derived / queries
    recentTags,
    addRecentTags,
    userCommunities,
    allCommunities,
    detectedImages,
  };
}
