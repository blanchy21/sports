'use client';

import React from 'react';
import { sanitizePostContent } from '@/lib/utils/sanitize';
import { proxyImagesInContent } from '@/lib/utils/image-proxy';

interface CommentContentProps {
  body: string;
  className?: string;
}

/**
 * Renders comment content with markdown/HTML support.
 * Uses the same sanitization pipeline as post bodies:
 * sanitizePostContent (markdown→HTML + DOMPurify) then proxyImagesInContent.
 */
export function CommentContent({ body, className = '' }: CommentContentProps) {
  const html = React.useMemo(() => proxyImagesInContent(sanitizePostContent(body)), [body]);

  // Content is sanitized through DOMPurify via sanitizePostContent
  return (
    <div
      className={`prose prose-sm max-w-none break-words dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
