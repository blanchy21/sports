"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Quote,
  Upload,
  Smile,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import dynamic from "next/dynamic";

// Import emoji picker dynamically (~300KB uncompressed)
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export interface EditorToolbarProps {
  onFormat: (type: FormatType) => void;
  onInsertImage: () => void;
  onInsertLink: () => void;
  onEmoji: (emoji: string) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export type FormatType =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "quote"
  | "h1"
  | "h2"
  | "h3"
  | "bulletList"
  | "numberedList";

export function EditorToolbar({
  onFormat,
  onInsertImage,
  onInsertLink,
  onEmoji,
  onUndo,
  onRedo,
}: EditorToolbarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const emojiButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close emoji picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".EmojiPickerReact")
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    onEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const ToolbarButton = ({
    onClick,
    title,
    children,
    className = "",
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={`h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground ${className}`}
    >
      {children}
    </Button>
  );

  const Separator = () => <div className="w-px h-5 bg-border mx-1" />;

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b bg-muted/30 flex-wrap">
      {/* Text formatting */}
      <ToolbarButton onClick={() => onFormat("bold")} title="Bold (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton onClick={() => onFormat("italic")} title="Italic (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton onClick={() => onFormat("underline")} title="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => onFormat("strikethrough")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <Separator />

      {/* Headings */}
      <ToolbarButton onClick={() => onFormat("h1")} title="Heading 1">
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton onClick={() => onFormat("h2")} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton onClick={() => onFormat("h3")} title="Heading 3">
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Separator />

      {/* Lists and blocks */}
      <ToolbarButton onClick={() => onFormat("quote")} title="Quote">
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton onClick={() => onFormat("bulletList")} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => onFormat("numberedList")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Separator />

      {/* Insert elements */}
      <ToolbarButton onClick={onInsertLink} title="Insert Link">
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton onClick={onInsertImage} title="Insert Image">
        <Upload className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton onClick={() => onFormat("code")} title="Code">
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <Separator />

      {/* Undo/Redo */}
      <ToolbarButton onClick={onUndo} title="Undo (Ctrl+Z)">
        <Undo className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton onClick={onRedo} title="Redo (Ctrl+Y)">
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <Separator />

      {/* Emoji picker */}
      <div className="relative">
        <Button
          ref={emojiButtonRef}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Insert Emoji"
          className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Smile className="h-4 w-4" />
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
    </div>
  );
}
