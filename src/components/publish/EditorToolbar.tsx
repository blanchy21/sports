'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import dynamic from 'next/dynamic';
import { GifPicker } from '@/components/gif/GifPicker';
import type { ViewMode } from '@/components/publish/PublishEditorPanel';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export interface EditorToolbarProps {
  onFormat: (type: FormatType) => void;
  onInsertImage: () => void;
  onInsertLink: () => void;
  onEmoji: (emoji: string) => void;
  onInsertGif?: (gifUrl: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export type FormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'quote'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'bulletList'
  | 'numberedList'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'table'
  | 'divider';

// Pill-style toolbar button
function Pill({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-5 py-2 text-[15px] font-medium',
        'text-sb-text-primary/70 transition-colors',
        'hover:bg-sb-turf hover:text-sb-text-primary',
        'whitespace-nowrap',
        className
      )}
    >
      {children}
    </button>
  );
}

// Dropdown pill with chevron
function DropdownPill({
  label,
  items,
}: {
  label: string;
  items: { label: string; onClick: () => void }[];
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-1 rounded-full px-5 py-2 text-[15px] font-medium',
          'text-sb-text-primary/70 transition-colors',
          'hover:bg-sb-turf hover:text-sb-text-primary',
          'whitespace-nowrap',
          isOpen && 'bg-sb-turf text-sb-text-primary'
        )}
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && menuPos && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border bg-sb-stadium py-1 shadow-lg"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className="flex w-full items-center px-4 py-2 text-sm text-sb-text-primary transition-colors hover:bg-sb-turf"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorToolbar({
  onFormat,
  onInsertImage,
  onInsertLink,
  onEmoji,
  onInsertGif,
  onUndo,
  onRedo,
  viewMode,
  onViewModeChange,
}: EditorToolbarProps) {
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showGifPicker, setShowGifPicker] = React.useState(false);
  const emojiButtonRef = React.useRef<HTMLDivElement>(null);

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

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    onEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gifUrl: string) => {
    onInsertGif?.(gifUrl);
    setShowGifPicker(false);
  };

  return (
    <div className="scrollbar-none sticky top-0 z-20 flex items-center gap-1 overflow-x-auto border-b bg-sb-stadium px-4 py-3">
      {/* Header dropdown */}
      <DropdownPill
        label="Header"
        items={[
          { label: 'Heading 1', onClick: () => onFormat('h1') },
          { label: 'Heading 2', onClick: () => onFormat('h2') },
          { label: 'Heading 3', onClick: () => onFormat('h3') },
          { label: 'Heading 4', onClick: () => onFormat('h4') },
          { label: 'Heading 5', onClick: () => onFormat('h5') },
          { label: 'Heading 6', onClick: () => onFormat('h6') },
        ]}
      />

      {/* Text formatting */}
      <Pill onClick={() => onFormat('bold')}>Bold</Pill>
      <Pill onClick={() => onFormat('italic')}>Italic</Pill>
      <Pill onClick={onInsertLink}>Link</Pill>
      <Pill onClick={() => onFormat('quote')}>Quote</Pill>

      {/* Format dropdown */}
      <DropdownPill
        label="Format"
        items={[
          { label: 'Underline', onClick: () => onFormat('underline') },
          { label: 'Strikethrough', onClick: () => onFormat('strikethrough') },
          { label: 'Align Left', onClick: () => onFormat('alignLeft') },
          { label: 'Align Center', onClick: () => onFormat('alignCenter') },
          { label: 'Align Right', onClick: () => onFormat('alignRight') },
          { label: 'Align Justify', onClick: () => onFormat('alignJustify') },
        ]}
      />

      {/* List dropdown */}
      <DropdownPill
        label="List"
        items={[
          { label: 'Bullet List', onClick: () => onFormat('bulletList') },
          { label: 'Numbered List', onClick: () => onFormat('numberedList') },
        ]}
      />

      {/* Code dropdown */}
      <DropdownPill
        label="Code"
        items={[{ label: 'Inline Code', onClick: () => onFormat('code') }]}
      />

      {/* Insert dropdown */}
      <DropdownPill
        label="Insert"
        items={[
          { label: 'Image', onClick: onInsertImage },
          ...(onInsertGif ? [{ label: 'GIF', onClick: () => setShowGifPicker(true) }] : []),
          { label: 'Table', onClick: () => onFormat('table') },
          { label: 'Divider', onClick: () => onFormat('divider') },
          { label: 'Emoji', onClick: () => setShowEmojiPicker(true) },
        ]}
      />

      <Pill onClick={onUndo}>Undo</Pill>
      <Pill onClick={onRedo}>Redo</Pill>

      {/* Right-aligned view mode toggle */}
      <div className="ml-auto flex items-center gap-1">
        {(['split', 'editor', 'preview'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              'rounded-full px-5 py-2 text-[15px] font-medium capitalize transition-colors',
              viewMode === mode
                ? 'text-primary ring-2 ring-primary'
                : 'text-sb-text-primary/70 hover:text-sb-text-primary'
            )}
          >
            {mode === 'split' ? 'Split' : mode === 'editor' ? 'Editor' : 'Preview'}
          </button>
        ))}
      </div>

      {/* Emoji picker popover */}
      {showEmojiPicker && (
        <div ref={emojiButtonRef} className="fixed z-50" style={{ top: '140px', left: '20px' }}>
          <EmojiPicker
            onEmojiClick={handleEmojiSelect}
            emojiStyle={'native' as unknown as import('emoji-picker-react').EmojiStyle}
            lazyLoadEmojis={true}
          />
        </div>
      )}

      {/* GIF picker */}
      {showGifPicker && (
        <div className="fixed z-50" style={{ top: '140px', left: '20px' }}>
          <GifPicker
            isOpen={showGifPicker}
            onClose={() => setShowGifPicker(false)}
            onSelect={handleGifSelect}
          />
        </div>
      )}
    </div>
  );
}
