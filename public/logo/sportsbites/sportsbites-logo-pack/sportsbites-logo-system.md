# Sportsbites — Logo System

> Visual identity document. Part of the SportsBlock brand family.  
> Concept: The Lightning Hex — same shape as SportsBlock, faster energy.  
> Last updated: March 2026

---

## Relationship to SportsBlock

Sportsbites is a feature/sub-brand of SportsBlock. The logo system is designed to communicate that relationship clearly:

| Element | SportsBlock | Sportsbites |
|---------|------------|-------------|
| Mark shape | Hexagon | Same hexagon |
| Mark fill | `#00C49A` Teal | `#00C49A` Teal |
| Interior symbol | Upward chevron (earn/rise) | Lightning bolt (instant/electric) |
| Interior colour | `#051A14` Dark | `#051A14` Dark |
| Wordmark font | Barlow Condensed 700 | Barlow Condensed 700 |
| SPORTS colour | `#F0F0F0` White | `#F0F0F0` White |
| Differentiator | BLOCK in `#00C49A` Teal | BITES in `#E8A020` Gold |
| Sub-label | — | "by SportsBlock" |

---

## Files in this directory

| File | Usage |
|------|-------|
| `sportsbites-mark.svg` | Symbol/mark only — on dark backgrounds (primary use) |
| `sportsbites-mark-reversed.svg` | Symbol/mark only — on teal or light backgrounds |
| `sportsbites-horizontal.svg` | Full lockup, horizontal — mark left, wordmark right |
| `sportsbites-stacked.svg` | Full lockup, stacked — mark above wordmark |
| `sportsbites-favicon.svg` | Simplified mark, 32×32 optimised — browser favicon |

---

## The Mark — Concept Rationale

**The Lightning Hex** uses the exact hexagonal container from SportsBlock but replaces the upward chevron with a lightning bolt.

| Element | Meaning |
|---------|---------|
| **Hexagon shape** | Same as SportsBlock — immediate family recognition |
| **Lightning bolt** | Instant. Electric. The energy of a hot take in 280 characters. |
| **Teal fill `#00C49A`** | Shared with parent brand — same earning/action colour |
| **Dark interior `#051A14`** | On-chain permanence — your take is recorded forever |
| **BITES in Gold `#E8A020`** | Differentiates from BLOCK (teal) while staying in brand family |

---

## Wordmark

```
SPORTS  →  #F0F0F0  (Pure White)    —  Barlow Condensed 700
BITES   →  #E8A020  (MEDALS Gold)   —  Barlow Condensed 700
```

BITES is deliberately in gold, not teal. This creates instant visual distinction from SportsBlock while keeping both brands in the same colour family. Gold also references MEDALS — reinforcing the earning mechanic that Sportsbites is built around.

---

## Platform PNG Files

| File | Size | Platform |
|------|------|----------|
| `twitter-profile-400x400.png` | 400×400 | Twitter/X profile picture |
| `twitter-header-1500x500.png` | 1500×500 | Twitter/X header banner |
| `hive-profile-512x512.png` | 512×512 | Hive profile picture |
| `hive-banner-1280x320.png` | 1280×320 | Hive cover banner |
| `app-icon-1024x1024.png` | 1024×1024 | App Store / Play Store |
| `app-icon-512x512.png` | 512×512 | App icon |
| `app-icon-192x192.png` | 192×192 | PWA manifest |
| `favicon-32x32.png` | 32×32 | Browser favicon |
| `favicon-16x16.png` | 16×16 | Browser favicon small |
| `logo-horizontal-1200x300.png` | 1200×300 | Large format / print |
| `logo-horizontal-800x200.png` | 800×200 | Web header / email |
| `logo-horizontal-400x100.png` | 400×100 | Small format |
| `logo-stacked-600x525.png` | 600×525 | Square social assets |
| `logo-stacked-400x350.png` | 400×350 | Stacked lockup medium |
| `mark-transparent-512x512.png` | 512×512 | Mark, transparent bg |
| `mark-transparent-256x256.png` | 256×256 | Mark, transparent bg small |
| `mark-reversed-512x512.png` | 512×512 | Mark on teal/light backgrounds |
| `profile-1024x1024.png` | 1024×1024 | High-res profile, all platforms |
| `profile-200x200.png` | 200×200 | Small profile picture |

---

## React / Next.js Component

```tsx
// components/ui/SportsbitesMark.tsx
type Props = { size?: number; reversed?: boolean; className?: string }

export function SportsbitesMark({ size = 40, reversed = false, className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size} height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sportsbites"
      className={className}
    >
      <polygon
        points="110,82 60,110 10,82 10,38 60,10 110,38"
        fill={reversed ? '#0D0D0D' : '#00C49A'}
      />
      <path
        d="M68,22 L44,66 L62,66 L52,98 L76,54 L58,54 Z"
        fill={reversed ? '#00C49A' : '#051A14'}
      />
    </svg>
  )
}

// Horizontal lockup
export function SportsbytesLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 520 120"
      height={size} width={size * (520/120)}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sportsbites"
      className={className}
    >
      <polygon points="110,82 60,110 10,82 10,38 60,10 110,38" fill="#00C49A" />
      <path d="M68,22 L44,66 L62,66 L52,98 L76,54 L58,54 Z" fill="#051A14" />
      <text x="132" y="78" fontFamily="var(--font-display), 'Arial Narrow', sans-serif"
        fontWeight="700" fontSize="68" letterSpacing="-1" fill="#F0F0F0">SPORTS</text>
      <text x="392" y="78" fontFamily="var(--font-display), 'Arial Narrow', sans-serif"
        fontWeight="700" fontSize="68" letterSpacing="-1" fill="#E8A020">BITES</text>
      <text x="132" y="100" fontFamily="var(--font-body), 'Arial', sans-serif"
        fontWeight="500" fontSize="13" letterSpacing="2" fill="#555555">by SportsBlock</text>
    </svg>
  )
}
```

---

## Colour Variations

### On dark backgrounds — Primary
- Mark: `#00C49A` fill, `#051A14` interior
- Use: `sportsbites-mark.svg`

### On teal backgrounds
- Mark: `#0D0D0D` fill, `#00C49A` interior
- Use: `sportsbites-mark-reversed.svg`

### On light backgrounds — Print only
- Mark: `#0D0D0D` fill, `#00C49A` interior
- Use: `sportsbites-mark-reversed.svg`

---

## Forbidden Uses

- Do not use the SportsBlock upward chevron inside the Sportsbites hex — the lightning bolt is the differentiator
- Do not set BITES in teal — gold only. Teal is reserved for BLOCK
- Do not remove the "by SportsBlock" sub-label from the horizontal lockup
- Do not use the mark without the teal fill — it must always be `#00C49A`
- All SportsBlock logo forbidden uses also apply to Sportsbites

---

*Document maintained by SportsBlock founders.*
