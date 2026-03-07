'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function BlogPostContent({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none text-foreground dark:prose-invert prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-th:text-foreground prose-td:text-muted-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
