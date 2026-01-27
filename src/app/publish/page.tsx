'use client';

import React, { useState, Suspense } from 'react';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Eye,
  Save,
  Send,
  AlertCircle,
  Image as ImageIcon,
  MoreVertical,
  Calendar,
  X,
  Link as LinkIcon,
  Upload,
  Loader2,
} from 'lucide-react';
import { Community, SPORT_CATEGORIES } from '@/types';
import { cn } from '@/lib/utils/client';
import { validateImageUrl, validateUrl } from '@/lib/utils/sanitize';
import dynamic from 'next/dynamic';
import { publishPost, canUserPost, validatePostData } from '@/lib/hive-workerbee/posting';
import { PostData } from '@/lib/hive-workerbee/posting';
import { useCommunities, useUserCommunities } from '@/lib/react-query/queries/useCommunity';
import { useUIStore } from '@/stores/uiStore';
import { FirebasePosts } from '@/lib/firebase/posts';
import { uploadImage } from '@/lib/hive/imageUpload';

// Import new components
import { EditorToolbar, FormatType } from '@/components/publish/EditorToolbar';
import { TagInput } from '@/components/publish/TagInput';
import { AdvancedOptions, RewardsOption, Beneficiary } from '@/components/publish/AdvancedOptions';
import { ScheduleModal } from '@/components/publish/ScheduleModal';
import { UpgradeIncentive, UpgradeIncentiveBanner } from '@/components/upgrade/UpgradeIncentive';

import remarkGfm from 'remark-gfm';

// Loading skeleton for markdown preview
function MarkdownLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
      <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
      <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700"></div>
    </div>
  );
}

// Dynamically import heavy dependencies
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <MarkdownLoadingSkeleton />,
});

function PublishPageContent() {
  const { user, authType, hiveUser, isLoading: isAuthLoading } = useAuth();
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
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [rcStatus, setRcStatus] = useState<{
    canPost: boolean;
    rcPercentage: number;
    message?: string;
  } | null>(null);

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

  // Load draft if draft ID is provided
  React.useEffect(() => {
    const draftId = searchParams.get('draft');
    if (draftId && user) {
      setTimeout(() => loadDraft(draftId), 100);
    }
  }, [searchParams, user]);

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

  const loadDraft = (draftId: string) => {
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
      console.error('Error loading draft:', err);
    }
  };

  const checkRCStatus = React.useCallback(async () => {
    if (!hiveUser?.username) return;

    try {
      const status = await canUserPost(hiveUser.username);
      setRcStatus(status);
    } catch (error) {
      console.error('Error checking RC status:', error);
    }
  }, [hiveUser?.username]);

  // Check RC status for Hive users
  React.useEffect(() => {
    if (hiveUser?.username && authType === 'hive') {
      checkRCStatus();
    }
  }, [hiveUser, authType, checkRCStatus]);

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

  const handleImageInsert = () => {
    if (!imageUrl) return;

    // Validate the image URL
    const validation = validateImageUrl(imageUrl);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image URL');
      return;
    }

    const alt = imageAlt || 'image';
    const markdown = `\n![${alt}](${validation.url})\n`;

    // Use saved cursor position since textarea lost focus to dialog
    const pos = cursorPositionRef.current;
    const newContent = content.substring(0, pos) + markdown + content.substring(pos);
    setContent(newContent);

    // Restore focus to textarea
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        const newPos = pos + markdown.length;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);

    setImageUrl('');
    setImageAlt('');
    setImageTab('url');
    setUploadError(null);
    setShowImageDialog(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const result = await uploadImage(file, user?.username);

      if (result.success && result.url) {
        setImageUrl(result.url);
        setImageAlt(file.name.replace(/\.[^/.]+$/, '')); // Use filename without extension as alt
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Failed to upload image. Please try again or use a URL instead.'
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleInsertLink = () => {
    setShowLinkDialog(true);
  };

  const handleLinkInsert = () => {
    if (!linkUrl) return;

    // Validate the URL
    const validation = validateUrl(linkUrl);
    if (!validation.valid) {
      setPublishError(validation.error || 'Invalid URL');
      return;
    }

    const text = linkText || validation.url!;
    insertMarkdown('[', `](${validation.url})`, text);
    setLinkUrl('');
    setLinkText('');
    setShowLinkDialog(false);
    setPublishError(null);
  };

  const handleEmoji = (emoji: string) => {
    insertAtCursor(emoji);
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
        alert('Draft updated!');
      } catch (error) {
        console.error('Error saving draft:', error);
        alert('Failed to save draft.');
      }
    } else {
      existingDrafts.push(draftData);
      try {
        localStorage.setItem('drafts', JSON.stringify(existingDrafts));
        alert('Draft saved!');
      } catch (error) {
        console.error('Error saving draft:', error);
        alert('Failed to save draft.');
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

      // Create scheduled post
      await FirebasePosts.createScheduledPost(
        user.id,
        {
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
        scheduledAt
      );

      // Save used tags to recent tags
      if (tags.length > 0) {
        addRecentTags(tags);
      }

      alert(`Post scheduled for ${scheduledAt.toLocaleString()}`);
      router.push('/feed');
    } catch (error) {
      console.error('Error scheduling post:', error);
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

        const result = await publishPost(postData);

        if (result.success) {
          // Save used tags
          if (tags.length > 0) {
            addRecentTags(tags);
          }
          alert(`Post published to Hive! View: ${result.url}`);
          router.push('/feed');
        } else {
          setPublishError(result.error || 'Failed to publish post');
        }
      } else {
        // SOFT USER: Publish to Firebase via API directly to get postLimitInfo
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
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
      console.error('Error publishing post:', error);
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
  const previewLink = `sportsblock.com/@${username}/[post-slug]`;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Minimal Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/feed')}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
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
          </div>

          {/* Menu button */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className="h-8 w-8 p-0"
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

      {/* Main Content - Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Editor (60%) */}
        <div className="flex w-3/5 flex-col overflow-hidden border-r">
          {/* Title Input */}
          <div className="border-b px-6 py-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title"
              className="w-full border-none bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Editor Toolbar */}
          <EditorToolbar
            onFormat={handleFormat}
            onInsertImage={handleInsertImage}
            onInsertLink={handleInsertLink}
            onEmoji={handleEmoji}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          {/* Editor Textarea */}
          <div className="flex-1 overflow-auto">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post using Markdown..."
              className="h-full w-full resize-none border-none bg-background px-6 py-4 font-mono text-sm leading-relaxed outline-none"
            />
          </div>

          {/* Bottom Fields */}
          <div className="max-h-[45%] space-y-4 overflow-auto border-t px-6 py-4">
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
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Sport category is required to publish your post
                </p>
              )}
            </div>

            {/* Tags */}
            <TagInput
              value={tags}
              onChange={setTags}
              maxTags={10}
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
                    ? 'border border-green-500/20 bg-green-500/10'
                    : 'border border-destructive/20 bg-destructive/10'
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      rcStatus.canPost ? 'bg-green-500' : 'bg-destructive'
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
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
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

        {/* Right Side - Preview (40%) */}
        <div className="flex w-2/5 flex-col overflow-hidden bg-muted/30">
          {/* Preview Header */}
          <div className="border-b bg-background px-6 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Preview</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">Link: {previewLink}</p>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {coverImage && (
              <div className="mb-4 overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover"
                  className="h-40 w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {title && <h1 className="mb-4 text-2xl font-bold">{title}</h1>}

            {excerpt && <p className="mb-4 text-sm italic text-muted-foreground">{excerpt}</p>}

            {tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {content ? (
              <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <p className="italic text-muted-foreground">Start writing to see the preview...</p>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="border-t bg-card px-6 py-4">
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!title && !content}
            className="min-w-[120px]"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowScheduleModal(true)}
            disabled={!title || !content || !selectedSport}
            className="min-w-[120px]"
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
            className="min-w-[140px]"
          >
            <Send className="mr-2 h-4 w-4" />
            {isPublishing ? 'Publishing...' : authType === 'hive' ? 'Publish to Hive' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Insert Image</h3>
              <button
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl('');
                  setImageAlt('');
                  setImageTab('url');
                  setUploadError(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex border-b">
              <button
                onClick={() => setImageTab('url')}
                className={cn(
                  'flex-1 border-b-2 py-2 text-sm font-medium transition-colors',
                  imageTab === 'url'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <LinkIcon className="mr-2 inline h-4 w-4" />
                From URL
              </button>
              <button
                onClick={() => setImageTab('upload')}
                className={cn(
                  'flex-1 border-b-2 py-2 text-sm font-medium transition-colors',
                  imageTab === 'upload'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Upload className="mr-2 inline h-4 w-4" />
                Upload File
              </button>
            </div>

            <div className="space-y-4">
              {imageTab === 'url' ? (
                <div>
                  <label className="mb-2 block text-sm font-medium">Image URL</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-medium">Upload Image</label>
                  <div
                    className={cn(
                      'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                      isUploadingImage
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    )}
                  >
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          Drag and drop or click to select
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          style={{ position: 'absolute' }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleFileUpload(file);
                            };
                            input.click();
                          }}
                        >
                          Choose File
                        </Button>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Max 5MB • JPG, PNG, GIF, WebP
                        </p>
                      </>
                    )}
                  </div>
                  {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium">Alt Text</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe the image"
                  className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {imageUrl && (
                <div className="rounded-lg border p-2">
                  <p className="mb-2 text-xs text-muted-foreground">Preview:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={imageAlt || 'Preview'}
                    className="max-h-48 w-full rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImageDialog(false);
                    setImageUrl('');
                    setImageAlt('');
                    setImageTab('url');
                    setUploadError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleImageInsert} disabled={!imageUrl || isUploadingImage}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Insert
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Insert Link</h3>
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">URL</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Link Text (optional)</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Click here"
                  className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkUrl('');
                    setLinkText('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleLinkInsert} disabled={!linkUrl}>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Insert
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
      />

      {/* Post Published Success Modal with Upgrade Prompt (Soft Users) */}
      {showPostPublishedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Post Published!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your post is now live on Sportsblock.
              </p>
            </div>

            {/* Post Limit Warning */}
            {postLimitInfo && postLimitInfo.isNearLimit && (
              <div className="mb-4">
                <UpgradeIncentiveBanner
                  type={postLimitInfo.remaining <= 5 ? 'storage-critical' : 'storage-warning'}
                  postsRemaining={postLimitInfo.remaining}
                  totalPosts={postLimitInfo.limit}
                />
              </div>
            )}

            {/* Upgrade Incentive */}
            <UpgradeIncentive type="post-published" className="mb-4" dismissible={false} />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPostPublishedPrompt(false);
                  router.push('/feed');
                }}
                className="flex-1"
              >
                View Feed
              </Button>
              <Button
                onClick={() => {
                  setShowPostPublishedPrompt(false);
                  router.push('/settings?tab=wallet');
                }}
                className="flex-1"
              >
                Connect Hive
              </Button>
            </div>
          </div>
        </div>
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
