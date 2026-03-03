import React from 'react';
import { SPORT_CATEGORIES } from '@/types';

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
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(74,222,128,0.08) 0%, transparent 50%, rgba(245,158,11,0.06) 100%)',
            pointerEvents: 'none',
          }}
        />

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {sport && <span style={{ fontSize: 28 }}>{sport.icon}</span>}
            <span
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: '#A0A0B8',
                textTransform: 'uppercase',
                letterSpacing: 1,
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
              backgroundColor: 'rgba(74,222,128,0.15)',
              color: '#4ADE80',
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
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
              fontSize: title.length > 80 ? 28 : title.length > 50 ? 34 : 40,
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              color: '#F0EBE6',
            }}
          >
            {title}
          </h2>
          {matchReference && (
            <p
              style={{
                fontSize: 18,
                color: '#A0A0B8',
                margin: 0,
              }}
            >
              {matchReference}
            </p>
          )}
        </div>

        {/* Result banner */}
        <div
          style={{
            backgroundColor: 'rgba(74,222,128,0.12)',
            border: '1px solid rgba(74,222,128,0.25)',
            borderRadius: 12,
            padding: '14px 28px',
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 600,
            color: '#4ADE80',
            position: 'relative',
            zIndex: 1,
            marginBottom: 24,
          }}
        >
          Winner: {winningOutcomeLabel}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
            paddingBottom: 24,
            borderBottom: '1px solid rgba(240,235,230,0.1)',
            marginBottom: 20,
          }}
        >
          <StatCell label="Predictor" value={`@${username}`} color="#F0EBE6" />
          <Divider />
          <StatCell label="Win Rate" value={`${(winRate * 100).toFixed(0)}%`} color="#F59E0B" />
          <Divider />
          <StatCell
            label="Streak"
            value={currentStreak > 0 ? `${currentStreak}` : '—'}
            color="#F59E0B"
            prefix={currentStreak > 0 ? '\uD83D\uDD25 ' : ''}
          />
          <Divider />
          <StatCell
            label="Profit"
            value={`${profit >= 0 ? '+' : ''}${profit.toFixed(0)} M`}
            color={profit >= 0 ? '#4ADE80' : '#F87171'}
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
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#F59E0B',
            }}
          >
            SportsBlock
          </span>
          <span
            style={{
              fontSize: 16,
              color: '#A0A0B8',
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

function StatCell({
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
    <div style={{ textAlign: 'center', flex: 1 }}>
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
      <div style={{ fontSize: 22, fontWeight: 700, color }}>
        {prefix}
        {value}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 40,
        backgroundColor: 'rgba(240,235,230,0.15)',
      }}
    />
  );
}
