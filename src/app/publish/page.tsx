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
  Tag as TagIcon,
  Settings,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Smile,
  Undo,
  Code,
  Quote,
  Upload,
  X
} from "lucide-react";
import { SPORT_CATEGORIES } from "@/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";
import { publishPost, canUserPost, validatePostData } from "@/lib/hive-workerbee/posting";
import { PostData } from "@/lib/hive-workerbee/posting";

// Import emoji picker dynamically to avoid SSR issues
const EmojiPicker = dynamic(
  () => import("emoji-picker-react"),
  { ssr: false }
);

function PublishPageContent() {
  const { user, authType, hiveUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [tags, setTags] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [rcStatus, setRcStatus] = useState<{canPost: boolean; rcPercentage: number; message?: string} | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = React.useRef<HTMLButtonElement>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  // Load draft if draft ID is provided in URL
  React.useEffect(() => {
    const draftId = searchParams.get('draft');
    
    if (draftId && user) {
      // Add a small delay to ensure the component is fully mounted
      setTimeout(() => {
        loadDraft(draftId);
      }, 100);
    }
  }, [searchParams, user]);

  const loadDraft = (draftId: string) => {
    try {
      const savedDrafts = localStorage.getItem('drafts');
      
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts);
        
        // Try to find by ID first
        let draft = parsedDrafts.find((d: { id?: string }) => d.id === draftId);
        
        // If not found by ID, try to find by index (for old drafts without IDs)
        if (!draft) {
          // The draft ID format is "draft-timestamp-index", so we can extract the index
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
          setSelectedSport(draft.sport || '');
          setTags(Array.isArray(draft.tags) ? draft.tags.join(', ') : (draft.tags || ''));
          setImageUrl(draft.imageUrl || '');
          setImageAlt(draft.imageAlt || '');
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
    
    const newText = content.substring(0, start) + before + textToInsert + after + content.substring(end);
    setContent(newText);

    // Set cursor position
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

  // Formatting actions
  const formatBold = () => insertMarkdown("**", "**", "bold text");
  const formatItalic = () => insertMarkdown("*", "*", "italic text");
  const formatUnderline = () => insertMarkdown("<u>", "</u>", "underlined text");
  const formatStrikethrough = () => insertMarkdown("~~", "~~", "strikethrough text");
  const formatCode = () => insertMarkdown("`", "`", "code");
  const formatQuote = () => insertAtCursor("\n> ");
  
  const formatHeading = (level: number) => {
    const hashes = "#".repeat(level);
    insertAtCursor(`\n${hashes} `);
  };

  const formatBulletList = () => insertAtCursor("\n- ");
  const formatNumberedList = () => insertAtCursor("\n1. ");

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      insertMarkdown("[", `](${url})`, "link text");
    }
  };

  const insertImage = () => {
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

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    insertAtCursor(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleUndo = () => {
    document.execCommand('undo');
  };

  // Close emoji picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.EmojiPickerReact')
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleSaveDraft = () => {
    const draftId = searchParams.get('draft');
    const existingDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
    
    const draftData = {
      id: draftId || Date.now().toString(), // Use existing ID or generate new one
      title,
      content,
      excerpt: content.substring(0, 150) + (content.length > 150 ? '...' : ''), // Create excerpt
      sport: selectedSport,
      tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      imageUrl,
      imageAlt,
      createdAt: draftId ? existingDrafts.find((d: { id: string; createdAt?: string }) => d.id === draftId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
    };
    
    if (draftId) {
      // Update existing draft
      const updatedDrafts = existingDrafts.map((draft: { id: string }) => 
        draft.id === draftId ? draftData : draft
      );
      localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
      alert('Draft updated successfully!');
    } else {
      // Create new draft
      existingDrafts.push(draftData);
      localStorage.setItem('drafts', JSON.stringify(existingDrafts));
      alert('Draft saved successfully!');
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    
    setPublishError(null);
    setIsPublishing(true);

    try {
      // Validate post data
      const postData: PostData = {
        title: title.trim(),
        body: content.trim(),
        sportCategory: selectedSport,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        featuredImage: imageUrl || undefined,
        author: hiveUser?.username || user.username,
      };

      const validation = validatePostData(postData);
      if (!validation.isValid) {
        setPublishError(validation.errors.join(', '));
        return;
      }

      if (authType === "hive" && hiveUser?.username) {
        // Check if user has posting key available
        if (!hiveUser.postingKey) {
          setPublishError("Posting key not available. Please connect with Hive Keychain.");
          return;
        }

        // Check RC status
        if (rcStatus && !rcStatus.canPost) {
          setPublishError(rcStatus.message || "Insufficient Resource Credits to post.");
          return;
        }

        // Publish to Hive blockchain
        const result = await publishPost(postData);
        
        if (result.success) {
          alert(`Post published successfully! View on Hive: ${result.url}`);
          router.push('/feed');
        } else {
          setPublishError(result.error || "Failed to publish post");
        }
      } else {
        // For soft auth users, save as draft and prompt to connect Hive
        handleSaveDraft();
        alert("Post saved as draft. Connect with Hive Keychain to publish to the blockchain and earn rewards!");
      }
    } catch (error) {
      console.error("Error publishing post:", error);
      setPublishError("An unexpected error occurred while publishing.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to create and publish posts.
          </p>
          <Button onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="border-b bg-gradient-to-r from-primary to-accent shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/feed")}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="border-l border-white/30 h-6" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title..."
              className="text-xl font-semibold bg-transparent border-none outline-none w-96 placeholder:text-white/70 text-white"
            />
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-white/20 hover:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!title || !content}
              className="border-white/30 text-white hover:bg-white/20 hover:text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>

            
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!title || !content || !selectedSport || isPublishing || (authType === "hive" && rcStatus && !rcStatus.canPost) || false}
              className={cn(
                "min-w-[140px] text-white font-semibold",
                authType === "hive" 
                  ? "bg-primary hover:bg-primary/90 shadow-lg" 
                  : "bg-accent text-primary-foreground hover:bg-accent/90 shadow-lg"
              )}
            >
              <Send className="h-4 w-4 mr-2" />
              {isPublishing 
                ? "Publishing..." 
                : authType === "hive" 
                  ? "Publish to Hive" 
                  : "Save Draft"
              }
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t bg-gradient-to-r from-silver-bird to-white px-6 py-4 space-y-4 shadow-lg">
            <div className="grid grid-cols-2 gap-4">
              {/* Sport Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-primary">Sport Category</label>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-primary"
                >
                  <option value="">Select a sport</option>
                  {SPORT_CATEGORIES.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.icon} {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2 text-primary">Tags</label>
                <div className="relative">
                  <TagIcon className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="basketball, NBA, analysis"
                    className="w-full pl-10 pr-3 py-2 border-2 border-primary/30 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Auth Warning */}
            {authType !== "hive" && (
              <div className="bg-accent/10 dark:bg-accent/20 border border-accent/20 dark:border-accent/40 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-accent mt-0.5" />
                  <div>
                    <h4 className="font-medium text-accent dark:text-accent text-sm">
                      Guest Mode
                    </h4>
                    <p className="text-xs text-accent dark:text-accent mt-1">
                      Posts won&apos;t earn rewards or be published to the blockchain. Connect with Hive Keychain to unlock full features.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RC Status */}
            {authType === "hive" && rcStatus && (
              <div className={cn(
                "rounded-lg p-3",
                rcStatus.canPost 
                  ? "bg-accent/10 dark:bg-accent/20 border border-accent/20 dark:border-accent/40"
                  : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
              )}>
                <div className="flex items-start space-x-2">
                  <AlertCircle className={cn(
                    "h-4 w-4 mt-0.5",
                    rcStatus.canPost ? "text-accent" : "text-red-600"
                  )} />
                  <div>
                    <h4 className={cn(
                      "font-medium text-sm",
                      rcStatus.canPost 
                        ? "text-accent-foreground dark:text-accent-foreground"
                        : "text-red-800 dark:text-red-200"
                    )}>
                      Resource Credits: {rcStatus.rcPercentage.toFixed(1)}%
                    </h4>
                    {rcStatus.message && (
                      <p className={cn(
                        "text-xs mt-1",
                        rcStatus.canPost 
                          ? "text-accent-foreground/80 dark:text-accent-foreground/80"
                          : "text-red-700 dark:text-red-300"
                      )}>
                        {rcStatus.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Publish Error */}
            {publishError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200 text-sm">
                      Publishing Error
                    </h4>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      {publishError}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Split Editor View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Markdown Editor */}
        <div className="w-1/2 flex flex-col border-r">
          <div className="border-b bg-gradient-to-r from-primary to-primary/80">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/20">
              <h3 className="font-medium text-sm text-white">Editor</h3>
            </div>
            
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 flex-wrap bg-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={formatBold}
                title="Bold (Ctrl+B)"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <Bold className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={formatItalic}
                title="Italic (Ctrl+I)"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <Italic className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={formatUnderline}
                title="Underline"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={formatStrikethrough}
                title="Strikethrough"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-white/30 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(1)}
                title="Heading 1"
                className="h-8 px-2 text-xs font-bold text-white hover:bg-white/20 hover:text-white"
              >
                H1
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(2)}
                title="Heading 2"
                className="h-8 px-2 text-xs font-bold text-white hover:bg-white/20 hover:text-white"
              >
                H2
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(3)}
                title="Heading 3"
                className="h-8 px-2 text-xs font-bold text-white hover:bg-white/20 hover:text-white"
              >
                H3
              </Button>

              <div className="w-px h-6 bg-white/30 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={formatBulletList}
                title="Bullet List"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <List className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={formatNumberedList}
                title="Numbered List"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={formatQuote}
                title="Quote"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <Quote className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={formatCode}
                title="Code"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <Code className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-white/30 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={insertLink}
                title="Insert Link"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={insertImage}
                title="Upload Image"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <Upload className="h-4 w-4" />
              </Button>

              <div className="relative">
                <Button
                  ref={emojiButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Insert Emoji"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <EmojiPicker onEmojiClick={handleEmojiSelect} />
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-white/30 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                title="Undo (Ctrl+Z)"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <Undo className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post using Markdown...

# Heading 1
## Heading 2

**Bold text** or *italic text*

- List item 1
- List item 2

[Link text](https://example.com)

![Image alt text](image-url)

> Blockquote

```code block```"
              className="w-full h-full px-6 py-4 bg-background border-none outline-none resize-none font-mono text-sm leading-relaxed"
            />
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-1/2 flex flex-col bg-gradient-to-br from-silver-bird to-white">
          <div className="border-b px-6 py-3 bg-gradient-to-r from-accent to-accent/80">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-primary-foreground" />
              <h3 className="font-medium text-sm text-primary-foreground">Preview</h3>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-6 py-4">
            {title && (
              <h1 className="text-3xl font-bold mb-6">{title}</h1>
            )}
            {content ? (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Start writing to see the preview...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Image Upload Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-silver-bird to-white border-2 border-primary/30 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Insert Image</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl("");
                  setImageAlt("");
                }}
                className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-primary">
                  Image URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-primary">
                  Description (Alt Text)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe the image"
                  className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-primary"
                />
              </div>

              {imageUrl && (
                <div className="border-2 border-primary/30 rounded-lg p-2 bg-white/50">
                  <p className="text-xs text-primary mb-2 font-medium">Preview:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={imageAlt || "Preview"}
                    className="w-full rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImageDialog(false);
                    setImageUrl("");
                    setImageAlt("");
                  }}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImageInsert}
                  disabled={!imageUrl}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Insert Image
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PublishPageContent />
    </Suspense>
  );
}
