'use client';

import React, { useState, useCallback, Suspense } from 'react';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Save, Send, AlertCircle, MoreVertical, Calendar } from 'lucide-react';
import { Community, SPORT_CATEGORIES } from '@/types';
import { cn } from '@/lib/utils/client';
import { formatReadTime } from '@/lib/utils/formatting';
import { publishPost, canUserPost, validatePostData } from '@/lib/hive-workerbee/posting';
import { PostData } from '@/lib/hive-workerbee/posting';
import { useCommunities, useUserCommunities } from '@/lib/react-query/queries/useCommunity';
import { useUIStore } from '@/stores/uiStore';
import { logger } from '@/lib/logger';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useToast, toast } from '@/components/core/Toast';
import { useTransactionConfirmation } from '@/hooks/useTransactionConfirmation';
import { EditorToolbar, FormatType } from '@/components/publish/EditorToolbar';
import { TagInput } from '@/components/publish/TagInput';
import { AdvancedOptions, RewardsOption, Beneficiary } from '@/components/publish/AdvancedOptions';
import { ImageDialog } from '@/components/publish/ImageDialog';
import { LinkDialog } from '@/components/publish/LinkDialog';
import { PostPublishedModal } from '@/components/publish/PostPublishedModal';
import { MarkdownPreview } from '@/components/publish/MarkdownPreview';
import { ScheduleModal } from '@/components/publish/ScheduleModal';
import { UpgradeIncentiveBanner } from '@/components/upgrade/UpgradeIncentive';
import { TopNavigation } from '@/components/layout/TopNavigation';

function PublishPageContent() {
  const { user, authType, hiveUser, isLoading: isAuthLoading } = useAuth();
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
  const [showMenu, setShowMenu] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [rcStatus, setRcStatus] = useState<{
    canPost: boolean;
    rcPercentage: number;
    message?: string;
  } | null>(null);

  // Track AI-generated image URLs for metadata disclosure
  const [aiGeneratedUrls, setAiGeneratedUrls] = useState<Set<string>>(new Set());

  // Soft user post limit tracking
  const [postLimitInfo, setPostLimitInfo] = useState<{
    currentCount: number;
    limit: number;
    remaining: number;
    isNearLimit: boolean;
    upgradePrompt: string | null;
  } | null>(null);
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
  const detectedImages = React.useMemo(() => {
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

  // Load draft function
  const loadDraft = useCallback((draftId: string) => {
    if (typeof window === 'undefined') return;

    try {
      const savedDrafts = localStorage.getItem('drafts');
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts);
        let draft = parsedDrafts.find((d: { id?: string }) => d.id === draftId);

        if (!draft) {
          const match = draftId.match(/draft-(\d+)-(\d+)/);
          if (match) {
            const index = parseInt(match[2]);
            if (index >= 0 && index < parsedDrafts.length) {
              draft = parsedDrafts[index];
            }
          }
        }

        if (draft) {
          setTitle(draft.title || '');
          setContent(draft.content || '');
          setExcerpt(draft.excerpt || '');
          setSelectedSport(draft.sport || '');
          setTags(Array.isArray(draft.tags) ? draft.tags : []);
          setCoverImage(draft.imageUrl || '');
        }
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
      // Find community in user communities or all communities
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
      const status = await canUserPost(hiveUser.username);
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

  // Markdown formatting helpers
  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText =
      content.substring(0, start) + before + textToInsert + after + content.substring(end);
    setContent(newText);

    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = content.substring(0, start) + text + content.substring(start);
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  // Format handlers
  const handleFormat = (type: FormatType) => {
    switch (type) {
      case 'bold':
        insertMarkdown('**', '**', 'bold text');
        break;
      case 'italic':
        insertMarkdown('*', '*', 'italic text');
        break;
      case 'underline':
        insertMarkdown('<u>', '</u>', 'underlined text');
        break;
      case 'strikethrough':
        insertMarkdown('~~', '~~', 'strikethrough text');
        break;
      case 'code':
        insertMarkdown('`', '`', 'code');
        break;
      case 'quote':
        insertAtCursor('\n> ');
        break;
      case 'h1':
        insertAtCursor('\n# ');
        break;
      case 'h2':
        insertAtCursor('\n## ');
        break;
      case 'h3':
        insertAtCursor('\n### ');
        break;
      case 'bulletList':
        insertAtCursor('\n- ');
        break;
      case 'numberedList':
        insertAtCursor('\n1. ');
        break;
    }
  };

  const handleInsertImage = () => {
    cursorPositionRef.current = textareaRef.current?.selectionStart ?? content.length;
    setShowImageDialog(true);
  };

  const handleImageDialogInsert = (markdown: string) => {
    const pos = cursorPositionRef.current;
    const newContent = content.substring(0, pos) + markdown + content.substring(pos);
    setContent(newContent);

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        const newPos = pos + markdown.length;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);

    setShowImageDialog(false);
  };

  const handleInsertLink = () => {
    setShowLinkDialog(true);
  };

  const handleLinkDialogInsert = (url: string, text: string) => {
    const displayText = text || url;
    insertMarkdown('[', `](${url})`, displayText);
    setShowLinkDialog(false);
    setPublishError(null);
  };

  const handleEmoji = (emoji: string) => {
    insertAtCursor(emoji);
  };

  const handleInsertGif = (gifUrl: string) => {
    const markdown = `\n![gif](${gifUrl})\n`;
    insertAtCursor(markdown);
  };

  const handleUndo = () => {
    document.execCommand('undo');
  };

  const handleRedo = () => {
    document.execCommand('redo');
  };

  const handleSaveDraft = () => {
    if (typeof window === 'undefined') return;

    const draftId = searchParams.get('draft');
    const existingDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');

    const draftData = {
      id: draftId || Date.now().toString(),
      title,
      content,
      excerpt,
      sport: selectedSport,
      tags,
      imageUrl: coverImage,
      createdAt: draftId
        ? existingDrafts.find((d: { id: string }) => d.id === draftId)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: content.split(/\s+/).filter((word) => word.length > 0).length,
    };

    if (draftId) {
      const updatedDrafts = existingDrafts.map((draft: { id: string }) =>
        draft.id === draftId ? draftData : draft
      );
      try {
        localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
        addToast(toast.success('Success', 'Draft updated!'));
      } catch (error) {
        logger.error('Error saving draft', 'PublishPage', error);
        addToast(toast.error('Error', 'Failed to save draft.'));
      }
    } else {
      existingDrafts.push(draftData);
      try {
        localStorage.setItem('drafts', JSON.stringify(existingDrafts));
        addToast(toast.success('Success', 'Draft saved!'));
      } catch (error) {
        logger.error('Error saving draft', 'PublishPage', error);
        addToast(toast.error('Error', 'Failed to save draft.'));
      }
    }
  };

  const handleSchedule = async (scheduledAt: Date) => {
    if (!user) return;

    try {
      // Basic validation
      if (!title.trim()) {
        setPublishError('Title is required');
        return;
      }
      if (!content.trim()) {
        setPublishError('Content is required');
        return;
      }
      if (!selectedSport) {
        setPublishError('Please select a sport category');
        return;
      }

      // Create scheduled post via API
      const scheduleResponse = await fetch('/api/soft/scheduled-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          postData: {
            authorId: user.id,
            authorUsername: user.username,
            authorDisplayName: user.displayName,
            authorAvatar: user.avatar,
            title: title.trim(),
            content: content.trim(),
            tags,
            sportCategory: selectedSport,
            featuredImage: coverImage || undefined,
            communityId: selectedCommunity?.id,
            communitySlug: selectedCommunity?.slug,
            communityName: selectedCommunity?.name,
          },
          scheduledAt: scheduledAt.toISOString(),
        }),
      });
      const scheduleData = await scheduleResponse.json();
      if (!scheduleData.success) {
        throw new Error(scheduleData.error || 'Failed to schedule post');
      }

      // Save used tags to recent tags
      if (tags.length > 0) {
        addRecentTags(tags);
      }

      addToast(toast.success('Success', `Post scheduled for ${scheduledAt.toLocaleString()}`));
      router.push('/feed');
    } catch (error) {
      logger.error('Error scheduling post', 'PublishPage', error);
      setPublishError('Failed to schedule post');
    }
  };

  const handlePublish = async () => {
    if (!user) return;

    setPublishError(null);
    setIsPublishing(true);

    try {
      // Basic validation
      if (!title.trim()) {
        setPublishError('Title is required');
        return;
      }
      if (!content.trim()) {
        setPublishError('Content is required');
        return;
      }
      if (!selectedSport) {
        setPublishError('Please select a sport category');
        return;
      }

      if (authType === 'hive' && hiveUser?.username) {
        // HIVE USER: Publish to blockchain
        // Convert UI percentage (5 = 5%) to Hive basis points (500 = 5%)
        const hiveBeneficiaries = beneficiaries.map((b) => ({
          account: b.account,
          weight: b.weight * 100,
        }));

        // Check if cover image or any body image was AI-generated
        const hasAiMedia =
          (coverImage && aiGeneratedUrls.has(coverImage)) ||
          Array.from(aiGeneratedUrls).some((url) => content.includes(url));

        const postData: PostData = {
          title: title.trim(),
          body: content.trim(),
          sportCategory: selectedSport,
          tags,
          featuredImage: coverImage || undefined,
          author: hiveUser.username,
          subCommunity: selectedCommunity
            ? {
                id: selectedCommunity.id,
                slug: selectedCommunity.slug,
                name: selectedCommunity.name,
              }
            : undefined,
          beneficiaries: hiveBeneficiaries,
          rewardsOption,
          aiGenerated: hasAiMedia ? { coverImage: true } : undefined,
        };

        const validation = validatePostData(postData);
        if (!validation.isValid) {
          setPublishError(validation.errors.join(', '));
          return;
        }

        if (rcStatus && !rcStatus.canPost) {
          setPublishError(rcStatus.message || 'Insufficient Resource Credits to post.');
          return;
        }

        const result = await publishPost(postData, broadcast);

        if (result.success) {
          // Save used tags
          if (tags.length > 0) {
            addRecentTags(tags);
          }
          addToast(toast.success('Success', `Post published to Hive! View: ${result.url}`));
          // Fire-and-forget: poll for block confirmation and show toast
          if (result.transactionId) {
            confirmTx(result.transactionId);
          }
          router.push('/feed');
        } else {
          setPublishError(result.error || 'Failed to publish post');
        }
      } else {
        // SOFT USER: Publish via API directly to get postLimitInfo
        const response = await fetch('/api/posts', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authorId: user.id,
            authorUsername: user.username,
            authorDisplayName: user.displayName,
            authorAvatar: user.avatar,
            title: title.trim(),
            content: content.trim(),
            tags,
            sportCategory: selectedSport,
            featuredImage: coverImage || undefined,
            communityId: selectedCommunity?.id,
            communitySlug: selectedCommunity?.slug,
            communityName: selectedCommunity?.name,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Save used tags
          if (tags.length > 0) {
            addRecentTags(tags);
          }

          // Track post limit info for upgrade prompts
          if (data.postLimitInfo) {
            setPostLimitInfo(data.postLimitInfo);
          }

          // Show the upgrade prompt instead of alert
          setShowPostPublishedPrompt(true);
        } else if (data.limitReached) {
          // Post limit reached - show specific error
          setPublishError(
            data.message ||
              `You've reached the limit of ${data.limit} posts. Upgrade to Hive for unlimited posts!`
          );
          setPostLimitInfo({
            currentCount: data.currentCount,
            limit: data.limit,
            remaining: 0,
            isNearLimit: true,
            upgradePrompt: data.message,
          });
        } else {
          setPublishError(data.error || 'Failed to publish post');
        }
      }
    } catch (error) {
      logger.error('Error publishing post', 'PublishPage', error);
      setPublishError('An unexpected error occurred while publishing.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Show nothing while auth is loading
  if (isAuthLoading) {
    return null;
  }

  // User not authenticated
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
          <p className="mb-4 text-muted-foreground">Please sign in to create and publish posts.</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Generate preview link - always show Sportsblock URL
  const username = hiveUser?.username || user?.username || 'username';
  const previewLink = `sportsblock.app/@${username}/[post-slug]`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/[0.03] to-background">
      {/* App Navigation */}
      <TopNavigation />

      {/* Sub-header: community selector + actions */}
      <div className="relative border-b bg-card">
        <div className="flex items-center justify-between px-4 py-2 sm:px-6">
          <span className="text-sm text-foreground">
            Write a new post in{' '}
            <select
              value={selectedCommunity?.id || ''}
              onChange={(e) => {
                const communityId = e.target.value;
                if (!communityId) {
                  setSelectedCommunity(null);
                } else {
                  const community = [
                    ...(userCommunities || []),
                    ...(allCommunities?.communities || []),
                  ].find((c) => c.id === communityId);
                  setSelectedCommunity(community || null);
                }
              }}
              className="cursor-pointer border-none bg-transparent font-medium text-primary outline-none hover:underline"
            >
              <option value="">Sportsblock</option>
              {userCommunities?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </span>

          <div className="flex items-center gap-1">
            {/* Mobile preview toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 w-8 p-0 md:hidden"
              title={showPreview ? 'Show editor' : 'Show preview'}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            {/* Menu button */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenu(!showMenu)}
                className="h-8 w-8 p-0"
                title="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {showMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-card py-1 shadow-lg">
                  <button
                    onClick={() => {
                      handleSaveDraft();
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Save className="h-4 w-4" />
                    Save Draft
                  </button>
                  <button
                    onClick={() => {
                      setShowScheduleModal(true);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule Post
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Brand accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-bright-cobalt to-accent" />
      </div>

      {/* Main Content - Split View */}
      <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden sm:h-[calc(100vh-9.5rem)] md:flex-row lg:h-[calc(100vh-10.5rem)]">
        {/* Left Side - Editor (60%) */}
        <div
          className={cn(
            'flex w-full flex-col overflow-hidden border-b md:w-3/5 md:border-b-0 md:border-r',
            showPreview && 'hidden md:flex'
          )}
        >
          {/* Title Input */}
          <div className="border-b px-4 py-3 sm:px-6 sm:py-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title"
              className="w-full border-none bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground sm:text-2xl"
            />
          </div>

          {/* Single scrollable area for toolbar + editor + fields */}
          <div className="flex-1 overflow-auto">
            {/* Editor Toolbar - sticky within scroll context */}
            <div className="sticky top-0 z-10">
              <EditorToolbar
                onFormat={handleFormat}
                onInsertImage={handleInsertImage}
                onInsertLink={handleInsertLink}
                onEmoji={handleEmoji}
                onInsertGif={handleInsertGif}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </div>

            {/* Editor Textarea - auto-grows with content */}
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post using Markdown..."
                className="min-h-[60vh] w-full resize-none border-none bg-transparent font-mono text-sm leading-relaxed outline-none"
                style={{ overflow: 'hidden' }}
              />
            </div>

            {/* Word Count */}
            {content.trim() &&
              (() => {
                const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
                return (
                  <div className="border-t px-4 py-1.5 sm:px-6">
                    <span className="text-xs text-muted-foreground">
                      {wordCount} {wordCount === 1 ? 'word' : 'words'} · {formatReadTime(wordCount)}
                    </span>
                  </div>
                );
              })()}

            {/* Bottom Fields */}
            <div className="space-y-4 border-t px-4 py-3 sm:px-6 sm:py-4">
              {/* Short Description / Excerpt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Short Description</label>
                  <span className="text-xs text-muted-foreground">{excerpt.length}/120</span>
                </div>
                <input
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value.slice(0, 120))}
                  placeholder="Brief description of your post (optional)"
                  className={cn(
                    'w-full rounded-lg border bg-background px-3 py-2',
                    'text-sm focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                  maxLength={120}
                />
              </div>

              {/* Sport Category (Required - Prominent Position) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Choose a Sport <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border bg-background px-3 py-2.5',
                    'text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                    !selectedSport && 'text-muted-foreground'
                  )}
                >
                  <option value="">Select a sport category</option>
                  {SPORT_CATEGORIES.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.icon} {sport.name}
                    </option>
                  ))}
                </select>
                {!selectedSport && (
                  <p className="text-xs text-warning">
                    Sport category is required to publish your post
                  </p>
                )}
              </div>

              {/* Tags */}
              <TagInput
                value={tags}
                onChange={setTags}
                maxTags={5}
                recentTags={recentTags}
                placeholder="Add tags..."
              />

              {/* Advanced Options */}
              <AdvancedOptions
                selectedCommunity={selectedCommunity}
                onCommunityChange={setSelectedCommunity}
                userCommunities={userCommunities}
                allCommunities={allCommunities?.communities}
                rewardsOption={rewardsOption}
                onRewardsChange={setRewardsOption}
                beneficiaries={beneficiaries}
                onBeneficiariesChange={setBeneficiaries}
                coverImage={coverImage}
                onCoverImageChange={setCoverImage}
                detectedImages={detectedImages}
                isHiveUser={authType === 'hive'}
              />

              {/* Error Display */}
              {publishError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">{publishError}</p>
                  </div>
                </div>
              )}

              {/* RC Status (Hive users) */}
              {authType === 'hive' && rcStatus && (
                <div
                  className={cn(
                    'rounded-lg p-3',
                    rcStatus.canPost
                      ? 'border border-success/20 bg-success/10'
                      : 'border border-destructive/20 bg-destructive/10'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        rcStatus.canPost ? 'bg-success' : 'bg-destructive'
                      )}
                    />
                    <span className="text-sm">
                      Resource Credits: {rcStatus.rcPercentage.toFixed(1)}%
                    </span>
                  </div>
                  {rcStatus.message && (
                    <p className="mt-1 text-xs text-muted-foreground">{rcStatus.message}</p>
                  )}
                </div>
              )}

              {/* Soft User Notice */}
              {authType !== 'hive' && (
                <div className="space-y-3">
                  {/* Post Limit Warning */}
                  {postLimitInfo && postLimitInfo.isNearLimit && (
                    <UpgradeIncentiveBanner
                      type={postLimitInfo.remaining <= 5 ? 'storage-critical' : 'storage-warning'}
                      postsRemaining={postLimitInfo.remaining}
                      totalPosts={postLimitInfo.limit}
                    />
                  )}

                  {/* General soft user notice */}
                  <div className="rounded-lg border border-info/20 bg-info/10 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-info">
                        Your post will be visible to everyone. Connect with Hive to earn rewards!
                      </p>
                      {postLimitInfo && !postLimitInfo.isNearLimit && (
                        <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
                          {postLimitInfo.remaining}/{postLimitInfo.limit} posts left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* end single scrollable area */}
        </div>

        {/* Right Side - Preview (40%) */}
        <div
          className={cn(
            'overflow-hidden bg-muted/20 md:flex md:w-2/5 md:flex-col',
            showPreview ? 'flex w-full flex-col' : 'hidden'
          )}
        >
          <MarkdownPreview
            title={title}
            content={content}
            excerpt={excerpt}
            tags={tags}
            coverImage={coverImage}
            previewLink={previewLink}
          />
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="border-t bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!title && !content}
            className="w-full sm:w-auto sm:min-w-[120px]"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowScheduleModal(true)}
            disabled={!title || !content || !selectedSport}
            className="w-full sm:w-auto sm:min-w-[120px]"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </Button>

          <Button
            onClick={handlePublish}
            disabled={
              !title ||
              !content ||
              !selectedSport ||
              isPublishing ||
              (authType === 'hive' && rcStatus !== null && !rcStatus.canPost)
            }
            className="w-full sm:w-auto sm:min-w-[140px]"
          >
            <Send className="mr-2 h-4 w-4" />
            {isPublishing ? 'Publishing...' : authType === 'hive' ? 'Publish to Hive' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Image Dialog */}
      {showImageDialog && (
        <ImageDialog
          username={user?.username}
          onInsert={handleImageDialogInsert}
          onClose={() => setShowImageDialog(false)}
          onAiImageGenerated={(url) => setAiGeneratedUrls((prev) => new Set(prev).add(url))}
        />
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <LinkDialog onInsert={handleLinkDialogInsert} onClose={() => setShowLinkDialog(false)} />
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
      />

      {/* Post Published Success Modal (Soft Users) */}
      {showPostPublishedPrompt && (
        <PostPublishedModal
          postLimitInfo={postLimitInfo}
          onViewFeed={() => {
            setShowPostPublishedPrompt(false);
            router.push('/feed');
          }}
          onConnectHive={() => {
            setShowPostPublishedPrompt(false);
            router.push('/settings?tab=wallet');
          }}
        />
      )}
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense
      fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
    >
      <PublishPageContent />
    </Suspense>
  );
}
