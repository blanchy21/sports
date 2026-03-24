# SportsBlock — Typography System

> Visual identity document. Two fonts. One job each.  
> Barlow Condensed owns every headline. Inter owns every word you read.  
> Last updated: March 2026

---

## Font Stack Overview

| Role | Font | Weights | Variable |
|------|------|---------|----------|
| **Display** | Barlow Condensed | 400, 600, 700, 800 | `--font-display` |
| **Body / UI** | Inter | 400, 500, 600 | `--font-body` |
| **Monospace** | JetBrains Mono | 400 | `--font-mono` |

All three are free on Google Fonts and available via `next/font/google`.

---

## 1. Display Font — Barlow Condensed

**Role:** All headlines, hero text, score displays, match titles, section headings

**Why Barlow Condensed:**
Condensed typefaces are the visual language of sport. Every scoreboard, stadium banner, and broadcast lower-third uses condensed type — because it packs maximum information into minimum width and carries kinetic energy at large sizes. Barlow Condensed hits the sweet spot between editorial weight and accessibility: free on Google Fonts, excellent legibility at small sizes, and 9 weights giving full range from a whisper to a shout. The condensed structure means headlines can run long without wrapping — critical for live match copy.

**Approved weights:**
- `700` (Bold) — primary headlines, H1, H2, score displays
- `800` (ExtraBold) — hero sections, marketing headlines only
- `600` (SemiBold) — H3, card titles, section labels
- `400` (Regular) — rarely used; only for condensed body copy if needed

**Key settings:**
```css
font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
letter-spacing: -0.01em;   /* Tighten slightly at large sizes */
line-height: 0.95;          /* Headlines — very tight */
text-transform: uppercase;  /* For hero/marketing display only */
```

---

## 2. Body Font — Inter

**Role:** All UI text, body copy, descriptions, labels, buttons, navigation

**Why Inter:**
Inter was designed specifically for screen readability and is the gold standard for modern web UI. It outperforms system fonts at small sizes, has exceptional number rendering (critical for MEDALS balances, odds, and scores), and its tabular figures mean numbers align cleanly in tables and leaderboards. It pairs with condensed display fonts better than almost any alternative — the contrast in width creates natural hierarchy without needing size or colour to do all the work.

**Approved weights:**
- `400` (Regular) — all body copy and descriptions
- `500` (Medium) — UI labels, nav items, button text
- `600` (SemiBold) — button text (primary CTAs), strong emphasis in UI

**Key settings:**
```css
font-family: 'Inter', system-ui, sans-serif;
font-feature-settings: 'tnum' 1;  /* Tabular numbers for balances/scores */
line-height: 1.65;                  /* Body copy */
line-height: 1.4;                   /* UI elements */
```

---

## 3. Monospace Font — JetBrains Mono

**Role:** MEDALS balances, wallet addresses, transaction IDs, Hive usernames, on-chain data, API keys during onboarding

**Why monospace here:**
Monospace signals "this is a real number / real address" — it borrows credibility from finance and code tooling. JetBrains Mono has better legibility than Courier or Roboto Mono, particularly for numbers and distinguishing `0` vs `O`, `1` vs `l`.

**Use exclusively for:**
- MEDALS token balance amounts: `4,820.00 MEDALS`
- Hive account names: `@username`
- Transaction IDs and block numbers
- Wallet addresses (truncated): `7f3a2b...e91c`

**Colour pairing:** Always display in `#E8A020` (MEDALS Gold) when showing token amounts.

---

## 4. Type Scale

| Name | Font | Size | Weight | Line Height | Usage |
|------|------|------|--------|-------------|-------|
| **Display XL** | Barlow Condensed | 72px | 700–800 | 0.9 | Hero sections, landing page only |
| **Display L** | Barlow Condensed | 48px | 700 | 0.95 | Section headlines, H1 |
| **Display M** | Barlow Condensed | 36px | 700 | 1.0 | Score displays, H2 |
| **Display S** | Barlow Condensed | 24px | 600 | 1.1 | Card titles, H3 |
| **Body L** | Inter | 16px | 400 | 1.65 | Primary body copy |
| **Body M** | Inter | 14px | 400 | 1.6 | Secondary copy, descriptions |
| **Label** | Inter | 12px | 500 | 1.3 | Tags, badges, uppercase UI labels |
| **Caption** | Inter | 11px | 400 | 1.4 | Timestamps, meta, footnotes |
| **MEDALS** | JetBrains Mono | 14–16px | 400 | 1.4 | Token amounts, addresses |

---

## 5. Next.js Implementation

### Font setup — `app/layout.tsx`

```typescript
import { Barlow_Condensed, Inter, JetBrains_Mono } from 'next/font/google'

const displayFont = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

### Tailwind config — `tailwind.config.ts`

```typescript
fontFamily: {
  display: ['var(--font-display)', 'Arial Narrow', 'sans-serif'],
  body:    ['var(--font-body)',    'Inter',        'system-ui', 'sans-serif'],
  mono:    ['var(--font-mono)',    'ui-monospace',  'monospace'],
},
fontSize: {
  'display-xl': ['72px', { lineHeight: '0.9',  letterSpacing: '-0.01em', fontWeight: '700' }],
  'display-l':  ['48px', { lineHeight: '0.95', letterSpacing: '-0.01em', fontWeight: '700' }],
  'display-m':  ['36px', { lineHeight: '1.0',  letterSpacing: '-0.01em', fontWeight: '700' }],
  'display-s':  ['24px', { lineHeight: '1.1',  letterSpacing: '0',       fontWeight: '600' }],
},
```

### CSS custom properties — `globals.css`

```css
:root {
  --font-display: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, monospace;
}
```

---

## 6. Tailwind Class Reference

```tsx
// Hero headline
<h1 className="font-display font-bold text-display-l uppercase tracking-tight text-sb-text-primary">
  PURE SPORTS. REAL REWARDS.
</h1>

// Score display
<div className="font-display font-bold text-display-m text-sb-text-primary">
  Arsenal 2 – 1 City
</div>

// Card title
<h3 className="font-display font-semibold text-display-s text-sb-text-primary">
  Matchday 32 Predictions
</h3>

// Body copy
<p className="font-body text-base leading-relaxed text-sb-text-body">
  Back your prediction before kick-off.
</p>

// UI label (uppercase badge)
<span className="font-body font-medium text-xs tracking-wider uppercase text-sb-teal">
  PREDICTION OPEN
</span>

// MEDALS balance
<span className="font-mono text-sm text-sb-gold">
  4,820.00 MEDALS
</span>

// Timestamp / meta
<span className="font-body text-[11px] text-sb-text-muted">
  2 hours ago · Hive block #82,441,202
</span>
```

---

## 7. Typography Rules — Never Break These

1. **Barlow Condensed for display only. Inter for everything you read.** Never mix roles — don't use Barlow Condensed for body copy or Inter for hero headlines.
2. **MEDALS amounts are always monospace and always gold.** `font-mono` + `text-sb-gold`. Every time, without exception.
3. **Uppercase is for display headlines and short UI labels only.** Body copy, descriptions, and long-form content is always sentence case.
4. **No font sizes below 11px.** Caption at 11px is the floor. Smaller text is inaccessible and undermines the brand.
5. **Use tabular numbers for anything financial.** Add `font-feature-settings: 'tnum' 1` on any element displaying scores, MEDALS balances, or leaderboard numbers. This prevents layout shift as numbers update.
6. **Letter spacing on uppercase display text.** Large uppercase Barlow Condensed benefits from `tracking-tight` (`letter-spacing: -0.01em`). Short uppercase labels (badges, tags) benefit from `tracking-wider` (`letter-spacing: 0.06em`).

---

*Document maintained by SportsBlock founders.*
