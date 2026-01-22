"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  Image as ImageIcon,
  Smile,
  X,
  Loader2,
  MapPin,
  Send,
  Upload,
  Link as LinkIcon,
  Film,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORT_CATEGORIES } from "@/types";
import { SHORTS_CONFIG, createShortOperation, validateShortContent } from "@/lib/hive-workerbee/shorts";
import { uploadImage } from "@/lib/hive/imageUpload";
import { validateImageUrl } from "@/lib/utils/sanitize";
import dynamic from "next/dynamic";

// Import emoji picker dynamically
const EmojiPicker = dynamic(
  () => import("emoji-picker-react"),
  { ssr: false }
);

// Tenor GIF result type
interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif: { url: string };
    tinygif: { url: string };
    nanogif: { url: string };
  };
}

interface ComposeShortProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function ComposeShort({ onSuccess, onError }: ComposeShortProps) {
  const { user, authType, hiveUser } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [sportCategory, setSportCategory] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // GIF picker state
  const [gifs, setGifs] = useState<string[]>([]);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [gifResults, setGifResults] = useState<TenorGif[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const charCount = content.length;
  const maxChars = SHORTS_CONFIG.MAX_CHARS;
  const remainingChars = maxChars - charCount;
  const charPercentage = (charCount / maxChars) * 100;

  // Character count color based on remaining
  const getCharCountColor = () => {
    if (remainingChars < 0) return "text-red-500";
    if (remainingChars <= 20) return "text-yellow-500";
    return "text-muted-foreground";
  };

  // Circular progress indicator values
  const circleRadius = 10;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (Math.min(charPercentage, 100) / 100) * circumference;

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const newContent = content.slice(0, start) + emojiData.emoji + content.slice(start);
      setContent(newContent);
      
      // Move cursor after emoji
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

    // Validate the URL
    const validation = validateImageUrl(imageUrl.trim());
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid image URL");
      return;
    }

    setImages([...images, validation.url!]);
    setImageUrl("");
    setUploadError(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be less than 5MB");
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
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to upload image. Please try again or use a URL."
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // GIF search using server-side API route
  const searchGifs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGifResults([]);
      return;
    }

    setIsLoadingGifs(true);
    setGifError(null);

    try {
      const response = await fetch(
        `/api/tenor?type=search&q=${encodeURIComponent(query)}&limit=20`
      );

      if (!response.ok) {
        throw new Error("Failed to search GIFs");
      }

      const data = await response.json();
      if (data.success) {
        setGifResults(data.data || []);
      } else {
        throw new Error(data.error || "Failed to search GIFs");
      }
    } catch (error) {
      console.error("GIF search error:", error);
      setGifError("Failed to load GIFs. Please try again.");
      setGifResults([]);
    } finally {
      setIsLoadingGifs(false);
    }
  }, []);

  // Load trending GIFs when picker opens
  const loadTrendingGifs = useCallback(async () => {
    setIsLoadingGifs(true);
    setGifError(null);

    try {
      const response = await fetch('/api/tenor?type=featured&limit=20');

      if (!response.ok) {
        throw new Error("Failed to load trending GIFs");
      }

      const data = await response.json();
      if (data.success) {
        setGifResults(data.data || []);
      } else {
        throw new Error(data.error || "Failed to load trending GIFs");
      }
    } catch (error) {
      console.error("Trending GIF error:", error);
      setGifError("Failed to load GIFs. Please try again.");
    } finally {
      setIsLoadingGifs(false);
    }
  }, []);

  const handleGifSelect = (gif: TenorGif) => {
    const gifUrl = gif.media_formats.gif?.url || gif.media_formats.tinygif?.url;
    if (gifUrl) {
      setGifs([...gifs, gifUrl]);
      setShowGifPicker(false);
      setGifSearchQuery("");
      setGifResults([]);
    }
  };

  const handleRemoveGif = (index: number) => {
    setGifs(gifs.filter((_, i) => i !== index));
  };

  const handlePublish = useCallback(async () => {
    if (!user || !hiveUser?.username) {
      onError?.("Please connect with Hive to post shorts");
      return;
    }

    const validation = validateShortContent(content);
    if (!validation.isValid) {
      onError?.(validation.errors.join(", "));
      return;
    }

    setIsPublishing(true);

    try {
      // Create the operation
      const operation = createShortOperation({
        body: content,
        author: hiveUser.username,
        sportCategory: sportCategory || undefined,
        images: images.length > 0 ? images : undefined,
        gifs: gifs.length > 0 ? gifs : undefined,
      });

      // Import aioha for broadcasting
      const { aioha } = await import("@/lib/aioha/config");
      
      // Type assertion for Aioha instance
      const aiohaInstance = aioha as { signAndBroadcastTx?: (ops: unknown[], keyType: string) => Promise<unknown> } | null;
      
      if (!aiohaInstance || typeof aiohaInstance.signAndBroadcastTx !== 'function') {
        throw new Error("Hive authentication not available. Please reconnect.");
      }

      // Broadcast the transaction
      const result = await aiohaInstance.signAndBroadcastTx(
        [['comment', operation]],
        'posting'
      );

      if (!result || (result as { error?: string }).error) {
        throw new Error((result as { error?: string }).error || "Failed to broadcast");
      }

      // Success - clear form
      setContent("");
      setImages([]);
      setGifs([]);
      setSportCategory("");
      onSuccess?.();
    } catch (error) {
      console.error("Error publishing short:", error);
      onError?.(error instanceof Error ? error.message : "Failed to publish short");
    } finally {
      setIsPublishing(false);
    }
  }, [content, images, gifs, sportCategory, user, hiveUser, onSuccess, onError]);

  // Cleanup debounce timeout on unmount
  React.useEffect(() => {
    return () => {
      if (gifSearchTimeoutRef.current) {
        clearTimeout(gifSearchTimeoutRef.current);
      }
    };
  }, []);

  // Close pickers when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Close emoji picker
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(target as Node) &&
        !target.closest('.EmojiPickerReact')
      ) {
        setShowEmojiPicker(false);
      }

      // Close GIF picker
      if (
        showGifPicker &&
        !target.closest('[data-gif-picker]')
      ) {
        setShowGifPicker(false);
        // Clear debounce timeout when closing picker
        if (gifSearchTimeoutRef.current) {
          clearTimeout(gifSearchTimeoutRef.current);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showGifPicker]);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [content]);

  const canPublish = 
    content.trim().length > 0 && 
    remainingChars >= 0 && 
    authType === "hive" && 
    !isPublishing;

  if (!user) {
    return (
      <div className="bg-card border rounded-xl p-6 text-center">
        <p className="text-muted-foreground">
          Sign in to post shorts
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl">
      <div className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar
            src={user.avatar}
            fallback={user.username || "?"}
            alt={user.displayName || user.username || "User"}
            size="md"
            className="flex-shrink-0"
          />

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening in sports?"
              className={cn(
                "w-full bg-transparent border-none outline-none resize-none",
                "text-lg placeholder:text-muted-foreground/60",
                "min-h-[60px] max-h-[200px]"
              )}
              disabled={isPublishing}
            />

            {/* Image previews */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Attached ${index + 1}`}
                      className="w-20 h-20 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                      }}
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* GIF previews */}
            {gifs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {gifs.map((gif, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-purple-500/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif}
                      alt={`GIF ${index + 1}`}
                      className="w-24 h-24 object-cover"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-600/80 rounded text-[10px] text-white font-medium">
                      GIF
                    </div>
                    <button
                      onClick={() => handleRemoveGif(index)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Sport category badge */}
            {sportCategory && (
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  <MapPin className="h-3 w-3" />
                  {SPORT_CATEGORIES.find(s => s.id === sportCategory)?.icon}{" "}
                  {SPORT_CATEGORIES.find(s => s.id === sportCategory)?.name}
                  <button
                    onClick={() => setSportCategory("")}
                    className="ml-1 hover:text-primary/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}

            {/* Image input panel */}
            {showImageInput && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                {/* Tab buttons */}
                <div className="flex gap-1 mb-3">
                  <button
                    type="button"
                    onClick={() => setImageInputMode("upload")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      imageInputMode === "upload"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode("url")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      imageInputMode === "url"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <LinkIcon className="h-4 w-4" />
                    URL
                  </button>
                  <div className="flex-1" />
                  <Button size="sm" variant="ghost" onClick={() => {
                    setShowImageInput(false);
                    setUploadError(null);
                    setImageUrl("");
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Upload mode */}
                {imageInputMode === "upload" && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className={cn(
                        "w-full flex flex-col items-center justify-center gap-2 p-4",
                        "border-2 border-dashed border-muted-foreground/30 rounded-lg",
                        "hover:border-primary/50 hover:bg-primary/5 transition-colors",
                        "text-muted-foreground",
                        isUploadingImage && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-sm">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6" />
                          <span className="text-sm">Click to select an image</span>
                          <span className="text-xs text-muted-foreground/70">Max 5MB</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* URL mode */}
                {imageInputMode === "url" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 px-3 py-2 bg-background rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary border"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImage();
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleAddImage} disabled={!imageUrl.trim()}>
                      Add
                    </Button>
                  </div>
                )}

                {/* Error message */}
                {uploadError && (
                  <p className="text-sm text-destructive mt-2">{uploadError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
        <div className="flex items-center gap-1">
          {/* Image button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowImageInput(!showImageInput)}
            className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
            title="Add image"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          {/* Emoji button */}
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
              <div className="absolute top-full left-0 mt-2 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  emojiStyle={"native" as unknown as import("emoji-picker-react").EmojiStyle}
                  lazyLoadEmojis={true}
                />
              </div>
            )}
          </div>

          {/* GIF button - disabled until Tenor API is configured */}
          <div className="relative" data-gif-picker>
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-9 w-9 p-0 text-muted-foreground/50 cursor-not-allowed"
              title="GIFs temporarily unavailable"
            >
              <Film className="h-5 w-5" />
            </Button>

            {showGifPicker && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-card border rounded-lg shadow-lg w-80 max-h-96 overflow-hidden">
                {/* Search input */}
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={gifSearchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGifSearchQuery(value);

                        // Clear existing timeout
                        if (gifSearchTimeoutRef.current) {
                          clearTimeout(gifSearchTimeoutRef.current);
                        }

                        // Debounce search by 300ms
                        gifSearchTimeoutRef.current = setTimeout(() => {
                          if (value.trim()) {
                            searchGifs(value);
                          } else {
                            loadTrendingGifs();
                          }
                        }, 300);
                      }}
                      placeholder="Search GIFs..."
                      className="w-full pl-8 pr-3 py-2 bg-muted rounded-md text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* GIF results */}
                <div className="p-2 overflow-y-auto max-h-72">
                  {isLoadingGifs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : gifError ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {gifError}
                    </div>
                  ) : gifResults.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {gifSearchQuery ? "No GIFs found" : "Search for GIFs"}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {gifResults.map((gif) => (
                        <button
                          key={gif.id}
                          type="button"
                          onClick={() => handleGifSelect(gif)}
                          className="relative aspect-square overflow-hidden rounded hover:opacity-80 transition-opacity"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={gif.media_formats.tinygif?.url || gif.media_formats.gif?.url}
                            alt={gif.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tenor attribution */}
                <div className="px-2 py-1.5 border-t bg-muted/50 text-center">
                  <span className="text-[10px] text-muted-foreground">Powered by Tenor</span>
                </div>
              </div>
            )}
          </div>

          {/* Sport category button */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSportPicker(!showSportPicker)}
              className="h-9 w-9 p-0 text-primary hover:bg-primary/10"
              title="Tag sport"
            >
              <MapPin className="h-5 w-5" />
            </Button>

            {showSportPicker && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-card border rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto w-48">
                {SPORT_CATEGORIES.map((sport) => (
                  <button
                    key={sport.id}
                    onClick={() => {
                      setSportCategory(sport.id);
                      setShowSportPicker(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left",
                      "hover:bg-muted transition-colors",
                      sportCategory === sport.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <span>{sport.icon}</span>
                    <span>{sport.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Character counter */}
          <div className="flex items-center gap-2">
            {charCount > 0 && (
              <>
                {/* Circular progress */}
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
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
                      remainingChars < 0 ? "text-red-500" :
                      remainingChars <= 20 ? "text-yellow-500" :
                      "text-primary"
                    )}
                  />
                </svg>
                
                {/* Show remaining chars when close to limit */}
                {remainingChars <= 20 && (
                  <span className={cn("text-sm font-medium", getCharCountColor())}>
                    {remainingChars}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Divider */}
          {charCount > 0 && (
            <div className="w-px h-6 bg-border" />
          )}

          {/* Post button */}
          <Button
            onClick={handlePublish}
            disabled={!canPublish}
            className={cn(
              "px-5 font-semibold",
              authType !== "hive" && "opacity-50"
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hive auth warning */}
      {authType !== "hive" && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/30 border-t border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Connect with Hive Keychain to post shorts and earn rewards
          </p>
        </div>
      )}
    </div>
  );
}
