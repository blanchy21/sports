'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

function MarkdownLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-3/4 rounded bg-muted"></div>
      <div className="h-4 w-full rounded bg-muted"></div>
      <div className="h-4 w-5/6 rounded bg-muted"></div>
    </div>
  );
}

const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <MarkdownLoadingSkeleton />,
});

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'center',
    'div',
    'span',
    'img',
    'iframe',
    'video',
    'source',
    'hr',
    'br',
    'sup',
    'sub',
  ],
  attributes: {
    ...defaultSchema.attributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'className'],
    iframe: ['src', 'width', 'height', 'frameBorder', 'allowFullScreen'],
    div: ['className'],
    span: ['className'],
    '*': ['className'],
  },
};

interface MarkdownPreviewProps {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  coverImage: string;
  previewLink: string;
}

export function MarkdownPreview({
  title,
  content,
  excerpt,
  tags,
  coverImage,
  previewLink,
}: MarkdownPreviewProps) {
  return (
    <>
      {/* Preview Header */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Preview</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">Link: {previewLink}</p>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {coverImage && (
          <div className="mb-4 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt="Cover"
              className="h-40 w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {title && <h1 className="mb-4 text-2xl font-bold">{title}</h1>}

        {excerpt && <p className="mb-4 text-sm italic text-muted-foreground">{excerpt}</p>}

        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="text-xs text-primary">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {content ? (
          <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="italic text-muted-foreground">Start writing to see the preview...</p>
        )}
      </div>
    </>
  );
}
