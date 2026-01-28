'use client';

import React from 'react';

interface CommentContentProps {
  body: string;
  className?: string;
}

/**
 * Renders comment content with support for markdown images/GIFs
 * Converts ![alt](url) syntax to actual <img> elements
 */
export function CommentContent({ body, className = '' }: CommentContentProps) {
  // Parse markdown images: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = imageRegex.exec(body)) !== null) {
    // Add text before the image
    if (match.index > lastIndex) {
      const textBefore = body.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push(
          <span key={`text-${keyIndex++}`} className="whitespace-pre-wrap">
            {textBefore}
          </span>
        );
      }
    }

    // Add the image
    const alt = match[1] || 'image';
    const url = match[2];

    parts.push(
      <span key={`img-${keyIndex++}`} className="my-2 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="max-h-64 max-w-full rounded-lg"
          loading="lazy"
          onError={(e) => {
            // Hide broken images
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last image
  if (lastIndex < body.length) {
    const remainingText = body.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push(
        <span key={`text-${keyIndex++}`} className="whitespace-pre-wrap">
          {remainingText}
        </span>
      );
    }
  }

  // If no images found, just return the text
  if (parts.length === 0) {
    return <p className={`whitespace-pre-wrap text-sm text-foreground ${className}`}>{body}</p>;
  }

  return <div className={`text-sm text-foreground ${className}`}>{parts}</div>;
}
