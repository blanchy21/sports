"use client";

import React, { useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { Community } from "@/types";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { publishPost, canUserPost, validatePostData } from "@/lib/hive-workerbee/posting";
import { PostData } from "@/lib/hive-workerbee/posting";
import { useCommunities, useUserCommunities } from "@/lib/react-query/queries/useCommunity";
import { UnifiedPostingService } from "@/lib/posting/unified";
import { useUIStore } from "@/stores/uiStore";
import { FirebasePosts } from "@/lib/firebase/posts";

// Import new components
import { EditorToolbar, FormatType } from "@/components/publish/EditorToolbar";
import { TagInput } from "@/components/publish/TagInput";
import { AdvancedOptions, RewardsOption, Beneficiary } from "@/components/publish/AdvancedOptions";
import { ScheduleModal } from "@/components/publish/ScheduleModal";

import remarkGfm from "remark-gfm";

// Loading skeleton for markdown preview
function MarkdownLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
  );
}

// Dynamically import heavy dependencies
const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
  loading: () => <MarkdownLoadingSkeleton />,
});

function PublishPageContent() {
  const { user, authType, hiveUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [coverImage, setCoverImage] = useState("");
  const [rewardsOption, setRewardsOption] = useState<RewardsOption>("50_50");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { account: "sportsblock", weight: 5 },
  ]);

  // UI state
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [rcStatus, setRcStatus] = useState<{
    canPost: boolean;
    rcPercentage: number;
    message?: string;
  } | null>(null);

  // Refs
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Store
  const { recentTags, addRecentTags } = useUIStore();

  // Fetch communities
  const { data: userCommunities } = useUserCommunities(user?.id || "");
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
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  // Load draft if draft ID is provided
  React.useEffect(() => {
    const draftId = searchParams.get("draft");
    if (draftId && user) {
      setTimeout(() => loadDraft(draftId), 100);
    }
  }, [searchParams, user]);

  // Close menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadDraft = (draftId: string) => {
    if (typeof window === "undefined") return;

    try {
      const savedDrafts = localStorage.getItem("drafts");
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
          setTitle(draft.title || "");
          setContent(draft.content || "");
          setExcerpt(draft.excerpt || "");
          setSelectedSport(draft.sport || "");
          setTags(Array.isArray(draft.tags) ? draft.tags : []);
          setCoverImage(draft.imageUrl || "");
        }
      }
    } catch (err) {
      console.error("Error loading draft:", err);
    }
  };

  const checkRCStatus = React.useCallback(async () => {
    if (!hiveUser?.username) return;

    try {
      const status = await canUserPost(hiveUser.username);
      setRcStatus(status);
    } catch (error) {
      console.error("Error checking RC status:", error);
    }
  }, [hiveUser?.username]);

  // Check RC status for Hive users
  React.useEffect(() => {
    if (hiveUser?.username && authType === "hive") {
      checkRCStatus();
    }
  }, [hiveUser, authType, checkRCStatus]);

  // Markdown formatting helpers
  const insertMarkdown = (before: string, after: string = "", placeholder: string = "") => {
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
      case "bold":
        insertMarkdown("**", "**", "bold text");
        break;
      case "italic":
        insertMarkdown("*", "*", "italic text");
        break;
      case "underline":
        insertMarkdown("<u>", "</u>", "underlined text");
        break;
      case "strikethrough":
        insertMarkdown("~~", "~~", "strikethrough text");
        break;
      case "code":
        insertMarkdown("`", "`", "code");
        break;
      case "quote":
        insertAtCursor("\n> ");
        break;
      case "h1":
        insertAtCursor("\n# ");
        break;
      case "h2":
        insertAtCursor("\n## ");
        break;
      case "h3":
        insertAtCursor("\n### ");
        break;
      case "bulletList":
        insertAtCursor("\n- ");
        break;
      case "numberedList":
        insertAtCursor("\n1. ");
        break;
    }
  };

  const handleInsertImage = () => {
    setShowImageDialog(true);
  };

  const handleImageInsert = () => {
    if (imageUrl) {
      const alt = imageAlt || "image";
      insertAtCursor(`\n![${alt}](${imageUrl})\n`);
      setImageUrl("");
      setImageAlt("");
      setShowImageDialog(false);
    }
  };

  const handleInsertLink = () => {
    setShowLinkDialog(true);
  };

  const handleLinkInsert = () => {
    if (linkUrl) {
      const text = linkText || linkUrl;
      insertMarkdown("[", `](${linkUrl})`, text);
      setLinkUrl("");
      setLinkText("");
      setShowLinkDialog(false);
    }
  };

  const handleEmoji = (emoji: string) => {
    insertAtCursor(emoji);
  };

  const handleUndo = () => {
    document.execCommand("undo");
  };

  const handleRedo = () => {
    document.execCommand("redo");
  };

  const handleSaveDraft = () => {
    if (typeof window === "undefined") return;

    const draftId = searchParams.get("draft");
    const existingDrafts = JSON.parse(localStorage.getItem("drafts") || "[]");

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
        localStorage.setItem("drafts", JSON.stringify(updatedDrafts));
        alert("Draft updated!");
      } catch (error) {
        console.error("Error saving draft:", error);
        alert("Failed to save draft.");
      }
    } else {
      existingDrafts.push(draftData);
      try {
        localStorage.setItem("drafts", JSON.stringify(existingDrafts));
        alert("Draft saved!");
      } catch (error) {
        console.error("Error saving draft:", error);
        alert("Failed to save draft.");
      }
    }
  };

  const handleSchedule = async (scheduledAt: Date) => {
    if (!user) return;

    try {
      // Basic validation
      if (!title.trim()) {
        setPublishError("Title is required");
        return;
      }
      if (!content.trim()) {
        setPublishError("Content is required");
        return;
      }
      if (!selectedSport) {
        setPublishError("Please select a sport category");
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
      router.push("/feed");
    } catch (error) {
      console.error("Error scheduling post:", error);
      setPublishError("Failed to schedule post");
    }
  };

  const handlePublish = async () => {
    if (!user) return;

    setPublishError(null);
    setIsPublishing(true);

    try {
      // Basic validation
      if (!title.trim()) {
        setPublishError("Title is required");
        return;
      }
      if (!content.trim()) {
        setPublishError("Content is required");
        return;
      }
      if (!selectedSport) {
        setPublishError("Please select a sport category");
        return;
      }

      if (authType === "hive" && hiveUser?.username) {
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
          setPublishError(validation.errors.join(", "));
          return;
        }

        if (rcStatus && !rcStatus.canPost) {
          setPublishError(rcStatus.message || "Insufficient Resource Credits to post.");
          return;
        }

        const result = await publishPost(postData);

        if (result.success) {
          // Save used tags
          if (tags.length > 0) {
            addRecentTags(tags);
          }
          alert(`Post published to Hive! View: ${result.url}`);
          router.push("/feed");
        } else {
          setPublishError(result.error || "Failed to publish post");
        }
      } else {
        // SOFT USER: Publish to Firebase
        const result = await UnifiedPostingService.createPost(user, {
          title: title.trim(),
          content: content.trim(),
          tags,
          sportCategory: selectedSport,
          featuredImage: coverImage || undefined,
          communityId: selectedCommunity?.id,
          communitySlug: selectedCommunity?.slug,
          communityName: selectedCommunity?.name,
        });

        if (result.success) {
          // Save used tags
          if (tags.length > 0) {
            addRecentTags(tags);
          }
          alert("Post published! Connect to Hive to earn rewards on future posts.");
          router.push("/feed");
        } else {
          setPublishError(result.error || "Failed to publish post");
        }
      }
    } catch (error) {
      console.error("Error publishing post:", error);
      setPublishError("An unexpected error occurred while publishing.");
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
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to create and publish posts.</p>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Generate preview link
  const previewLink = hiveUser?.username
    ? `peakd.com/@${hiveUser.username}/[post-slug]`
    : "sportsblock.com/[username]/[post-slug]";

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Minimal Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/feed")}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-foreground">
              Write a new post in{" "}
              <select
                value={selectedCommunity?.id || ""}
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
                className="bg-transparent font-medium text-primary hover:underline cursor-pointer border-none outline-none"
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
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    handleSaveDraft();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Draft
                </button>
                <button
                  onClick={() => {
                    setShowScheduleModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
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
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Editor (60%) */}
        <div className="w-3/5 flex flex-col border-r overflow-hidden">
          {/* Title Input */}
          <div className="border-b px-6 py-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title"
              className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground"
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
              className="w-full h-full px-6 py-4 bg-background border-none outline-none resize-none font-mono text-sm leading-relaxed"
            />
          </div>

          {/* Bottom Fields */}
          <div className="border-t px-6 py-4 space-y-4 max-h-[45%] overflow-auto">
            {/* Short Description / Excerpt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Short Description
                </label>
                <span className="text-xs text-muted-foreground">{excerpt.length}/120</span>
              </div>
              <input
                type="text"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value.slice(0, 120))}
                placeholder="Brief description of your post (optional)"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border bg-background",
                  "text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                )}
                maxLength={120}
              />
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
              selectedSport={selectedSport}
              onSportChange={setSelectedSport}
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
              isHiveUser={authType === "hive"}
            />

            {/* Error Display */}
            {publishError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{publishError}</p>
                </div>
              </div>
            )}

            {/* RC Status (Hive users) */}
            {authType === "hive" && rcStatus && (
              <div
                className={cn(
                  "rounded-lg p-3",
                  rcStatus.canPost
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-destructive/10 border border-destructive/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      rcStatus.canPost ? "bg-green-500" : "bg-destructive"
                    )}
                  />
                  <span className="text-sm">
                    Resource Credits: {rcStatus.rcPercentage.toFixed(1)}%
                  </span>
                </div>
                {rcStatus.message && (
                  <p className="text-xs text-muted-foreground mt-1">{rcStatus.message}</p>
                )}
              </div>
            )}

            {/* Soft User Notice */}
            {authType !== "hive" && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Your post will be visible to everyone. Connect with Hive to earn rewards!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Preview (40%) */}
        <div className="w-2/5 flex flex-col bg-muted/30 overflow-hidden">
          {/* Preview Header */}
          <div className="border-b px-6 py-3 bg-background">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Preview</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">Link: {previewLink}</p>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {coverImage && (
              <div className="mb-4 rounded-lg overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            {title && <h1 className="text-2xl font-bold mb-4">{title}</h1>}

            {excerpt && <p className="text-muted-foreground text-sm mb-4 italic">{excerpt}</p>}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {content ? (
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Start writing to see the preview...</p>
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
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowScheduleModal(true)}
            disabled={!title || !content || !selectedSport}
            className="min-w-[120px]"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>

          <Button
            onClick={handlePublish}
            disabled={
              !title ||
              !content ||
              !selectedSport ||
              isPublishing ||
              (authType === "hive" && rcStatus !== null && !rcStatus.canPost)
            }
            className="min-w-[140px]"
          >
            <Send className="h-4 w-4 mr-2" />
            {isPublishing
              ? "Publishing..."
              : authType === "hive"
                ? "Publish to Hive"
                : "Publish"}
          </Button>
        </div>
      </div>

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Insert Image</h3>
              <button
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl("");
                  setImageAlt("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Alt Text</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe the image"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {imageUrl && (
                <div className="border rounded-lg p-2">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={imageAlt || "Preview"}
                    className="w-full rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImageDialog(false);
                    setImageUrl("");
                    setImageAlt("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleImageInsert} disabled={!imageUrl}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Insert
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Insert Link</h3>
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                  setLinkText("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">URL</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Link Text (optional)</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Click here"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkUrl("");
                    setLinkText("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleLinkInsert} disabled={!linkUrl}>
                  <LinkIcon className="h-4 w-4 mr-2" />
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
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <PublishPageContent />
    </Suspense>
  );
}
