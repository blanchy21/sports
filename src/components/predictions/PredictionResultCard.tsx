import React from 'react';
import { SPORT_CATEGORIES } from '@/types';
import { CARD_COLORS } from '@/lib/constants/card-colors';

interface PredictionResultCardProps {
  title: string;
  matchReference: string | null;
  sportCategory: string | null;
  winningOutcomeLabel: string;
  username: string;
  staked: number;
  payout: number;
  winRate: number;
  currentStreak: number;
}

/**
 * Pure presentational card for sharing prediction results.
 * Uses all inline styles for reliable html2canvas capture.
 * Fixed at 1200x630 — optimised for social media (Twitter/OG).
 */
export const PredictionResultCard = React.forwardRef<HTMLDivElement, PredictionResultCardProps>(
  function PredictionResultCard(
    {
      title,
      matchReference,
      sportCategory,
      winningOutcomeLabel,
      username,
      staked,
      payout,
      winRate,
      currentStreak,
    },
    ref
  ) {
    const sport = SPORT_CATEGORIES.find((s) => s.id === sportCategory);
    const profit = payout - staked;
    const sportEmoji = sport?.icon || '\u26BD';

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

        {/* Dual gradient overlay — green top-left, amber bottom-right */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(74,222,128,0.15) 0%, transparent 50%, rgba(245,158,11,0.12) 100%)',
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
              backgroundColor: CARD_COLORS.green,
              color: CARD_COLORS.bg,
              padding: '10px 24px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
            }}
          >
            <span style={{ fontSize: 18 }}>&#10003;</span>
            Correct Prediction
          </div>
        </div>

        {/* Focal area — title + match ref */}
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
              fontSize: title.length > 80 ? 30 : title.length > 50 ? 38 : 48,
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              color: CARD_COLORS.text,
              textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            }}
          >
            {title}
          </h2>
          {matchReference && (
            <p
              style={{
                fontSize: 18,
                color: CARD_COLORS.muted,
                margin: 0,
              }}
            >
              {matchReference}
            </p>
          )}
        </div>

        {/* Winner trophy ribbon */}
        <div
          style={{
            backgroundColor: 'rgba(74,222,128,0.20)',
            border: '1px solid rgba(74,222,128,0.30)',
            borderRadius: 12,
            padding: '16px 28px',
            textAlign: 'center',
            fontSize: 26,
            fontWeight: 700,
            color: CARD_COLORS.green,
            position: 'relative',
            zIndex: 1,
            marginBottom: 24,
          }}
        >
          {'\uD83C\uDFC6'} Winner: {winningOutcomeLabel} {'\uD83C\uDFC6'}
        </div>

        {/* Stats row — individual stat cards */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            position: 'relative',
            zIndex: 1,
            marginBottom: 20,
          }}
        >
          <StatCard label="Predictor" value={`@${username}`} color={CARD_COLORS.text} />
          <StatCard
            label="Win Rate"
            value={`${(winRate * 100).toFixed(0)}%`}
            color={CARD_COLORS.amber}
          />
          <StatCard
            label="Streak"
            value={currentStreak > 0 ? `${currentStreak}` : '\u2014'}
            color={CARD_COLORS.amber}
            prefix={currentStreak > 0 ? '\uD83D\uDD25 ' : ''}
          />
          <StatCard
            label="Profit"
            value={`${profit >= 0 ? '+' : ''}${profit.toFixed(0)} M`}
            color={profit >= 0 ? CARD_COLORS.green : CARD_COLORS.red}
          />
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
              color: CARD_COLORS.amber,
            }}
          >
            {'\u26A1'} SportsBlock
          </span>
          <span
            style={{
              fontSize: 14,
              color: CARD_COLORS.muted,
              fontStyle: 'italic',
            }}
          >
            Predict. Stake. Win.
          </span>
          <span
            style={{
              fontSize: 16,
              color: CARD_COLORS.muted,
            }}
          >
            sportsblock.app
          </span>
        </div>
      </div>
    );
  }
);
PredictionResultCard.displayName = 'PredictionResultCard';

function StatCard({
  label,
  value,
  color,
  prefix,
}: {
  label: string;
  value: string;
  color: string;
  prefix?: string;
}) {
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
          color: CARD_COLORS.muted,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>
        {prefix}
        {value}
      </div>
    </div>
  );
}
