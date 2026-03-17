'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function BlogPostContent({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none text-sb-text-primary dark:prose-invert prose-headings:text-sb-text-primary prose-a:text-primary prose-strong:text-sb-text-primary prose-th:text-sb-text-primary prose-td:text-muted-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
