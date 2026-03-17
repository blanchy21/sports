'use client';

import { cn } from '@/lib/utils/client';

interface EditorStatusBarProps {
  content: string;
  isDraftSaved: boolean;
}

export function EditorStatusBar({ content, isDraftSaved }: EditorStatusBarProps) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="flex items-center gap-3 border-t bg-sb-stadium px-4 py-1.5 text-xs text-muted-foreground">
      <span>
        {words} {words === 1 ? 'word' : 'words'}
      </span>
      <span className="text-border">·</span>
      <span>{chars} chars</span>
      <span className="text-border">·</span>
      <span>{readTime} min read</span>
      <span className="ml-auto flex items-center gap-1.5">
        <span
          className={cn('h-1.5 w-1.5 rounded-full', isDraftSaved ? 'bg-green-500' : 'bg-amber-400')}
        />
        {isDraftSaved ? 'Draft saved' : 'Unsaved changes'}
      </span>
    </div>
  );
}
