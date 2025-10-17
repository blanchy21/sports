"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
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

export default function PublishPage() {
  const { user, authType, hiveUser } = useAuth();
  const router = useRouter();
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

  // Check RC status for Hive users
  React.useEffect(() => {
    if (hiveUser?.username && authType === "hive") {
      checkRCStatus();
    }
  }, [hiveUser, authType]);

  const checkRCStatus = async () => {
    if (!hiveUser?.username) return;
    
    try {
      const status = await canUserPost(hiveUser.username);
      setRcStatus(status);
    } catch (error) {
      console.error("Error checking RC status:", error);
    }
  };

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
    // Save draft to localStorage for soft auth users
    const draft = {
      title,
      content,
      sport: selectedSport,
      tags,
      imageUrl,
      imageAlt,
      createdAt: new Date().toISOString(),
    };
    
    const existingDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');
    existingDrafts.push(draft);
    localStorage.setItem('drafts', JSON.stringify(existingDrafts));
    
    alert('Draft saved successfully!');
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
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/feed")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="border-l h-6" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title..."
              className="text-xl font-semibold bg-transparent border-none outline-none w-96 placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!title || !content}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!title || !content || !selectedSport || isPublishing || (authType === "hive" && rcStatus && !rcStatus.canPost) || false}
              className={cn(
                "min-w-[140px]",
                authType === "hive" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-orange-600 hover:bg-orange-700"
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
          <div className="border-t bg-background px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Sport Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Sport Category</label>
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
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
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="relative">
                  <TagIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="basketball, NBA, analysis"
                    className="w-full pl-10 pr-3 py-2 border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Auth Warning */}
            {authType !== "hive" && (
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800 dark:text-orange-200 text-sm">
                      Guest Mode
                    </h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
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
                  ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
              )}>
                <div className="flex items-start space-x-2">
                  <AlertCircle className={cn(
                    "h-4 w-4 mt-0.5",
                    rcStatus.canPost ? "text-green-600" : "text-red-600"
                  )} />
                  <div>
                    <h4 className={cn(
                      "font-medium text-sm",
                      rcStatus.canPost 
                        ? "text-green-800 dark:text-green-200"
                        : "text-red-800 dark:text-red-200"
                    )}>
                      Resource Credits: {rcStatus.rcPercentage.toFixed(1)}%
                    </h4>
                    {rcStatus.message && (
                      <p className={cn(
                        "text-xs mt-1",
                        rcStatus.canPost 
                          ? "text-green-700 dark:text-green-300"
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
          <div className="border-b bg-card">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h3 className="font-medium text-sm">Editor</h3>
            </div>
            
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={formatBold}
                title="Bold (Ctrl+B)"
                className="h-8 w-8 p-0"
              >
                <Bold className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={formatItalic}
                title="Italic (Ctrl+I)"
                className="h-8 w-8 p-0"
              >
                <Italic className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={formatUnderline}
                title="Underline"
                className="h-8 w-8 p-0"
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={formatStrikethrough}
                title="Strikethrough"
                className="h-8 w-8 p-0"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(1)}
                title="Heading 1"
                className="h-8 px-2 text-xs font-bold"
              >
                H1
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(2)}
                title="Heading 2"
                className="h-8 px-2 text-xs font-bold"
              >
                H2
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatHeading(3)}
                title="Heading 3"
                className="h-8 px-2 text-xs font-bold"
              >
                H3
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={formatBulletList}
                title="Bullet List"
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={formatNumberedList}
                title="Numbered List"
                className="h-8 w-8 p-0"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={formatQuote}
                title="Quote"
                className="h-8 w-8 p-0"
              >
                <Quote className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={formatCode}
                title="Code"
                className="h-8 w-8 p-0"
              >
                <Code className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={insertLink}
                title="Insert Link"
                className="h-8 w-8 p-0"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={insertImage}
                title="Upload Image"
                className="h-8 w-8 p-0"
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
                  className="h-8 w-8 p-0"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                
                {showEmojiPicker && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <EmojiPicker onEmojiClick={handleEmojiSelect} />
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                title="Undo (Ctrl+Z)"
                className="h-8 w-8 p-0"
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
        <div className="w-1/2 flex flex-col bg-card">
          <div className="border-b px-6 py-3 bg-card">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Preview</h3>
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
          <div className="bg-card border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Insert Image</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl("");
                  setImageAlt("");
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (Alt Text)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe the image"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {imageUrl && (
                <div className="border rounded-lg p-2 bg-muted">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
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
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImageInsert}
                  disabled={!imageUrl}
                  className="bg-primary hover:bg-primary/90"
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
