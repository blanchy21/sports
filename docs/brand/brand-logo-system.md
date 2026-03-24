# SportsBlock — Logo System

> Visual identity document. The Block concept — hexagonal badge with upward chevron.  
> Last updated: March 2026

---

## Files in this directory

| File | Usage |
|------|-------|
| `sportsblock-mark.svg` | Symbol/mark only — on dark backgrounds (primary use) |
| `sportsblock-mark-reversed.svg` | Symbol/mark only — on teal or light backgrounds |
| `sportsblock-horizontal.svg` | Full lockup, horizontal — mark left, wordmark right |
| `sportsblock-stacked.svg` | Full lockup, stacked — mark above wordmark |
| `sportsblock-favicon.svg` | Simplified mark, 32×32 optimised — browser favicon |

---

## The Mark — Concept Rationale

**The Block** is a hexagonal badge containing an upward chevron arrow with a base dot.

Each element is intentional:

| Element | Meaning |
|---------|---------|
| **Hexagon shape** | Simultaneously a blockchain block, a medal, and a ranked badge. The most stable geometric shape — signals strength and permanence. |
| **Upward chevron** | Level up. Earn more. Rise. The universal signal for progress and prediction. |
| **Base dot** | The anchor point. Your stake. Where the prediction begins. |
| **Teal fill (#00C49A)** | The earning colour. The action colour. "You're in." |
| **Dark interior (#051A14)** | The on-chain permanence. What's recorded never fades. |

---

## Wordmark

```
SPORTS  →  #F0F0F0  (Pure White)  —  Barlow Condensed 700
BLOCK   →  #00C49A  (Earn Green)  —  Barlow Condensed 700
```

The colour split is deliberate. The eye reads `SPORTS` first (context), then lands on `BLOCK` in teal (differentiator). Teal draws the eye to the blockchain/Web3 identity after the sports context is already established.

**Font:** Barlow Condensed 700. No other weight is approved for the wordmark.

---

## Lockup Variations

### 1. Horizontal — Primary Use
Mark on the left, wordmark on the right. Use for:
- Navigation bar / header
- Email signatures
- Social media profile headers
- Any landscape-format placement

### 2. Stacked — Secondary Use
Mark above, wordmark below. Use for:
- App icons (large)
- Square social media assets
- Profile avatars (if wordmark is needed)
- Marketing materials with limited width

### 3. Mark Only — Icon / Favicon
Hexagon mark without wordmark. Use for:
- Browser favicon (use `sportsblock-favicon.svg`)
- App icon base
- Small UI contexts where wordmark would be unreadable (< 120px wide)
- Social media profile photo / avatar

---

## Colour Variations

### On dark backgrounds — Primary
- Mark: `#00C49A` fill, `#051A14` interior
- Wordmark: `SPORTS` in `#F0F0F0`, `BLOCK` in `#00C49A`
- File: `sportsblock-mark.svg` / `sportsblock-horizontal.svg`

### On teal backgrounds — Live alerts, match day banners
- Mark: `#0D0D0D` fill, `#00C49A` interior
- Wordmark: `SPORTS` in `#0D0D0D`, `BLOCK` in `#0D0D0D`
- File: `sportsblock-mark-reversed.svg`

### On light backgrounds — Print only
- Mark: `#0D0D0D` fill, `#00C49A` interior
- Wordmark: `SPORTS` in `#0D0D0D`, `BLOCK` in `#00C49A`
- Never use on light backgrounds in the web UI — light backgrounds are not part of the SportsBlock visual system

---

## Clear Space Rules

Always maintain clear space around the logo equal to the height of the hexagon mark.

```
  ┌─────────────────────────────┐
  │     [clear space: 1× mark]  │
  │  [mark]  SPORTSBLOCK        │
  │     [clear space: 1× mark]  │
  └─────────────────────────────┘
```

On the horizontal lockup, the minimum clear space is the full height of the mark on all four sides.

---

## Minimum Sizes

| Format | Minimum width |
|--------|--------------|
| Mark only | 16px |
| Favicon SVG | 32px |
| Horizontal lockup | 160px |
| Stacked lockup | 120px |

Below these sizes, use the mark only (`sportsblock-favicon.svg`).

---

## React / Next.js Implementation

### As an inline SVG component

```tsx
// components/ui/Logo.tsx
import { cn } from '@/lib/utils'

type LogoProps = {
  variant?: 'horizontal' | 'stacked' | 'mark'
  size?: number
  className?: string
}

export function Logo({ variant = 'horizontal', size = 40, className }: LogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SportsBlock"
        className={cn(className)}
      >
        <polygon points="110,82 60,110 10,82 10,38 60,10 110,38" fill="#00C49A" />
        <path
          d="M34,88 L60,48 L86,88"
          fill="none"
          stroke="#051A14"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="100" r="7" fill="#051A14" />
      </svg>
    )
  }

  if (variant === 'horizontal') {
    return (
      <svg
        viewBox="0 0 480 120"
        height={size}
        width={size * 4}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SportsBlock"
        className={cn(className)}
      >
        {/* Mark */}
        <polygon points="110,82 60,110 10,82 10,38 60,10 110,38" fill="#00C49A" />
        <path d="M34,88 L60,48 L86,88" fill="none" stroke="#051A14" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="60" cy="100" r="7" fill="#051A14" />
        {/* Wordmark */}
        <text x="132" y="78" fontFamily="var(--font-display), 'Arial Narrow', sans-serif" fontWeight="700" fontSize="68" letterSpacing="-1" fill="#F0F0F0">SPORTS</text>
        <text x="390" y="78" fontFamily="var(--font-display), 'Arial Narrow', sans-serif" fontWeight="700" fontSize="68" letterSpacing="-1" fill="#00C49A">BLOCK</text>
      </svg>
    )
  }

  // stacked
  return (
    <svg
      viewBox="0 0 240 200"
      width={size * 2}
      height={size * (200/120)}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SportsBlock"
      className={cn(className)}
    >
      <g transform="translate(60, 0)">
        <polygon points="110,82 60,110 10,82 10,38 60,10 110,38" fill="#00C49A" />
        <path d="M34,88 L60,48 L86,88" fill="none" stroke="#051A14" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="60" cy="100" r="7" fill="#051A14" />
      </g>
      <text x="120" y="160" textAnchor="middle" fontFamily="var(--font-display), 'Arial Narrow', sans-serif" fontWeight="700" fontSize="52" letterSpacing="-0.5" fill="#F0F0F0">SPORTS</text>
      <text x="120" y="194" textAnchor="middle" fontFamily="var(--font-display), 'Arial Narrow', sans-serif" fontWeight="700" fontSize="32" letterSpacing="3" fill="#00C49A">BLOCK</text>
    </svg>
  )
}
```

### Using as `<img>` tag (e.g. in nav)

```tsx
<img
  src="/logo/sportsblock-horizontal.svg"
  alt="SportsBlock"
  height={40}
  width={160}
/>
```

### Next.js Image component

```tsx
import Image from 'next/image'

<Image
  src="/logo/sportsblock-horizontal.svg"
  alt="SportsBlock"
  width={160}
  height={40}
  priority
/>
```

Place all SVG files in `public/logo/` for direct URL access.

---

## Forbidden Uses

- Do not rotate or skew the mark
- Do not change the teal fill to any other colour — `#00C49A` only
- Do not place on a mid-grey background — always dark, teal, or light (print) only
- Do not use the wordmark without the correct font (Barlow Condensed 700)
- Do not recolour `SPORTS` — it is always `#F0F0F0` on dark or `#0D0D0D` on light
- Do not add drop shadows, gradients, or glow effects to the mark
- Do not stretch or distort proportions
- Do not use the horizontal lockup below 160px width — use mark only instead
- Do not use the MEDALS Gold colour (`#E8A020`) in the logo — gold is reserved for MEDALS token UI only

---

*Document maintained by SportsBlock founders.*
