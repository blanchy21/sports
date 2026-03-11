import React from 'react';
import { SPORT_CATEGORIES } from '@/types';

interface SportsbiteResultCardProps {
  author: string;
  body: string;
  sportCategory?: string;
  votes: number;
  replies: number;
  created: string;
  authorDisplayName?: string;
}

/**
 * Pure presentational card for sharing sportsbites.
 * Uses all inline styles for reliable html2canvas capture.
 * Fixed at 1200x630 — optimised for social media (Twitter/OG).
 */
export const SportsbiteResultCard = React.forwardRef<HTMLDivElement, SportsbiteResultCardProps>(
  function SportsbiteResultCard(
    { author, body, sportCategory, votes, replies, created, authorDisplayName },
    ref
  ) {
    const sport = SPORT_CATEGORIES.find((s) => s.id === sportCategory);
    const sportEmoji = sport?.icon || '\u26BD';
    const displayName = authorDisplayName || author;
    const truncatedBody = body.length > 280 ? body.slice(0, 277) + '...' : body;
    const initials = displayName.slice(0, 2).toUpperCase();

    const formattedDate = (() => {
      try {
        const d = new Date(created.endsWith('Z') ? created : created + 'Z');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return '';
      }
    })();

    return (
      <div
        ref={ref}
        style={{
          width: 1200,
          height: 630,
          backgroundColor: '#1A1A2E',
          color: '#F0EBE6',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 48,
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Diagonal stripe texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 12px)',
            pointerEvents: 'none',
          }}
        />

        {/* Gradient overlay — amber top-left, blue bottom-right */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, transparent 50%, rgba(59,130,246,0.12) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Giant faded sport emoji watermark */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 280,
            opacity: 0.05,
            pointerEvents: 'none',
            lineHeight: 1,
          }}
        >
          {sportEmoji}
        </div>

        {/* Header row — sport badge + author */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                fontSize: 40,
                width: 56,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 28,
              }}
            >
              {sportEmoji}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#A0A0B8',
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              {sport?.name || 'Sports'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                color: '#1A1A2E',
              }}
            >
              {initials}
            </div>
            <span style={{ fontSize: 16, color: '#A0A0B8' }}>@{author}</span>
          </div>
        </div>

        {/* Content area — sportsbite text */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            paddingLeft: 32,
            paddingRight: 32,
          }}
        >
          <p
            style={{
              fontSize: truncatedBody.length > 200 ? 26 : truncatedBody.length > 100 ? 32 : 40,
              fontWeight: 600,
              lineHeight: 1.4,
              margin: 0,
              color: '#F0EBE6',
              textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            }}
          >
            {truncatedBody}
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            position: 'relative',
            zIndex: 1,
            marginBottom: 20,
          }}
        >
          <StatCard label="Votes" value={String(votes)} color="#F59E0B" />
          <StatCard label="Replies" value={String(replies)} color="#F59E0B" />
          <StatCard label="Posted" value={formattedDate} color="#F0EBE6" />
        </div>

        {/* Branding footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#F59E0B',
            }}
          >
            {'\u26A1'} SportsBlock
          </span>
          <span
            style={{
              fontSize: 14,
              color: '#A0A0B8',
              fontStyle: 'italic',
            }}
          >
            Your Sports. Your Voice.
          </span>
          <span style={{ fontSize: 16, color: '#A0A0B8' }}>sportsblock.app</span>
        </div>
      </div>
    );
  }
);
SportsbiteResultCard.displayName = 'SportsbiteResultCard';

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '12px 0',
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: '#A0A0B8',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
