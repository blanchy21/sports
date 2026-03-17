import React from 'react';
import { SPORT_CATEGORIES } from '@/types';
import { CARD_COLORS } from '@/lib/constants/card-colors';
import type { PredictionBite } from '@/lib/predictions/types';

interface PredictionPromoCardProps {
  prediction: PredictionBite;
}

/**
 * Shareable prediction card for sportsbites promotion.
 * Uses all inline styles for reliable html2canvas capture.
 * Fixed at 1200x630 — optimised for social media.
 */
export const PredictionPromoCard = React.forwardRef<HTMLDivElement, PredictionPromoCardProps>(
  function PredictionPromoCard({ prediction }, ref) {
    const sport = SPORT_CATEGORIES.find((s) => s.id === prediction.sportCategory);
    const sportEmoji = sport?.icon || '\u26BD';
    const isOpen = prediction.status === 'OPEN';

    return (
      <div
        ref={ref}
        style={{
          width: 1200,
          height: 630,
          backgroundColor: CARD_COLORS.bg,
          color: CARD_COLORS.text,
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

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(232,160,32,0.15) 0%, transparent 50%, rgba(0,196,154,0.12) 100%)',
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

        {/* Header */}
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
                color: CARD_COLORS.muted,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              {sport?.name || 'Sports'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: isOpen ? CARD_COLORS.amber : CARD_COLORS.muted,
              color: CARD_COLORS.bg,
              padding: '10px 24px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
            }}
          >
            <span style={{ fontSize: 18 }}>{'\uD83C\uDFAF'}</span>
            {isOpen ? 'Open for Stakes' : prediction.status}
          </div>
        </div>

        {/* Title */}
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
            gap: 12,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <h2
            style={{
              fontSize: prediction.title.length > 80 ? 30 : prediction.title.length > 50 ? 38 : 48,
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              color: CARD_COLORS.text,
              textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            }}
          >
            {prediction.title}
          </h2>
          {prediction.matchReference && (
            <p style={{ fontSize: 18, color: CARD_COLORS.muted, margin: 0 }}>
              {prediction.matchReference}
            </p>
          )}
        </div>

        {/* Outcomes */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            position: 'relative',
            zIndex: 1,
            marginBottom: 24,
          }}
        >
          {prediction.outcomes.map((outcome) => {
            const pct =
              prediction.totalPool > 0
                ? Math.round((outcome.totalStaked / prediction.totalPool) * 100)
                : Math.round(100 / prediction.outcomes.length);
            return (
              <div
                key={outcome.id}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: CARD_COLORS.text,
                    marginBottom: 6,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {outcome.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: CARD_COLORS.amber }}>
                  {outcome.odds > 0 ? `${outcome.odds.toFixed(1)}x` : `${pct}%`}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: CARD_COLORS.muted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginTop: 2,
                  }}
                >
                  {outcome.backerCount} backer{outcome.backerCount !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
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
              color: CARD_COLORS.amber,
            }}
          >
            {'\u26A1'} SportsBlock
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: CARD_COLORS.green,
            }}
          >
            {'\uD83C\uDFC6'} {prediction.totalPool} MEDALS Pool
          </span>
          <span style={{ fontSize: 16, color: CARD_COLORS.muted }}>sportsblock.app</span>
        </div>
      </div>
    );
  }
);
PredictionPromoCard.displayName = 'PredictionPromoCard';
