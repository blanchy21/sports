# SportsBlock — Colour Palette

> Visual identity document. Built on the Outlaw/Hero archetype.  
> Dark, powerful backgrounds. Teal for earning and action. Amber/gold for prestige and reward.  
> Last updated: March 2026

---

## System Overview

The colour system uses two accent colours with a strict emotional split:

- **Teal** = doing (predicting, staking, earning, action)
- **Gold** = having (MEDALS balance, rank, prestige, reward)

Every screen starts on a dark background. No white-background views.

---

## Dark Backgrounds — The Foundation

| Name | Hex | Usage |
|------|-----|-------|
| **Void** | `#0D0D0D` | Page background. Deepest level. Never use pure `#000000`. |
| **Pitch** | `#111518` | Navigation bar, top chrome |
| **Stadium** | `#161B1E` | Primary card surfaces |
| **Turf** | `#1E2A2F` | Elevated cards, modals, dialogs |
| **Floodlight** | `#243038` | Hover states, active rows, selected items |

The subtle blue-green undertone in Stadium, Turf, and Floodlight references the Hive/teal brand DNA without announcing it.

---

## Primary Accent — Match Day Teal

| Name | Hex | Usage |
|------|-----|-------|
| **Earn Green** | `#00C49A` | Primary CTA buttons, links, active states. The "go" colour. |
| **Deep Teal** | `#00A882` | Hover state for Earn Green |
| **Flash Teal** | `#00E5B4` | Highlights, notification dots, glows |
| **Teal Shadow** | `#0A3D30` | Tinted backgrounds, success states, win notification backgrounds |

**Teal is used for:**
- Primary buttons ("Predict Now", "Stake MEDALS", "Sign Up Free")
- All hyperlinks and interactive text elements
- Progress bars, loading indicators, live match indicators
- Correct prediction result badges
- Teal Shadow as background on earnings summaries and win notifications

---

## Secondary Accent — MEDALS Gold

| Name | Hex | Usage |
|------|-----|-------|
| **MEDALS Gold** | `#E8A020` | MEDALS token UI everywhere. Leaderboard highlights. Top earner badges. |
| **Trophy Shine** | `#F5C355` | Hover state for gold elements. Star icons. Rating elements. |
| **Deep Gold** | `#C07A10` | Active/pressed state for gold elements |
| **Gold Shadow** | `#3D2800` | MEDALS balance card backgrounds. Prestige tier backgrounds. |

**Gold is used for:**
- MEDALS token balance display — everywhere it appears
- Leaderboard rank numbers and Hall of Fame tier indicators
- Prediction streak indicators ("🔥 7 in a row")
- Trophy Shine on star ratings, featured post highlights
- Gold Shadow as background on MEDALS wallet cards

---

## Text Hierarchy & Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| **Pure White** | `#F0F0F0` | H1, H2 headlines. Hero text. |
| **Body** | `#C8CDD0` | All body copy, paragraphs |
| **Muted** | `#888E94` | Meta, timestamps, secondary labels |
| **Border** | `#3A4248` | Card borders, dividers, separators |
| **Subtle** | `#2A3238` | Ghost borders, subtle dividers |

---

## Semantic Colours — States & Feedback

| State | Foreground | Background | Usage |
|-------|-----------|------------|-------|
| **Correct / Win** | `#00C49A` | `#0A3D30` | Correct prediction badge. Earning confirmed. Pool won. |
| **Wrong / Loss** | `#E84040` | `#3D0A0A` | Wrong prediction. Stake lost. Error states. |
| **Pending / Live** | `#E8A020` | `#3D2800` | Prediction open. Match in progress. Awaiting result. |

---

## Tailwind CSS Custom Tokens

Add to `tailwind.config.ts`:

```typescript
extend: {
  colors: {
    // Backgrounds
    'sb-void':       '#0D0D0D',
    'sb-pitch':      '#111518',
    'sb-stadium':    '#161B1E',
    'sb-turf':       '#1E2A2F',
    'sb-floodlight': '#243038',

    // Teal accent
    'sb-teal':          '#00C49A',
    'sb-teal-deep':     '#00A882',
    'sb-teal-flash':    '#00E5B4',
    'sb-teal-shadow':   '#0A3D30',

    // Gold accent
    'sb-gold':          '#E8A020',
    'sb-gold-shine':    '#F5C355',
    'sb-gold-deep':     '#C07A10',
    'sb-gold-shadow':   '#3D2800',

    // Text
    'sb-text-primary':   '#F0F0F0',
    'sb-text-body':      '#C8CDD0',
    'sb-text-muted':     '#888E94',

    // Borders
    'sb-border':         '#3A4248',
    'sb-border-subtle':  '#2A3238',

    // Semantic
    'sb-win':            '#00C49A',
    'sb-win-bg':         '#0A3D30',
    'sb-loss':           '#E84040',
    'sb-loss-bg':        '#3D0A0A',
    'sb-pending':        '#E8A020',
    'sb-pending-bg':     '#3D2800',
  }
}
```

---

## CSS Custom Properties

Add to `globals.css`:

```css
:root {
  /* Backgrounds */
  --sb-void:            #0D0D0D;
  --sb-pitch:           #111518;
  --sb-stadium:         #161B1E;
  --sb-turf:            #1E2A2F;
  --sb-floodlight:      #243038;

  /* Teal */
  --sb-teal:            #00C49A;
  --sb-teal-deep:       #00A882;
  --sb-teal-flash:      #00E5B4;
  --sb-teal-shadow:     #0A3D30;

  /* Gold */
  --sb-gold:            #E8A020;
  --sb-gold-shine:      #F5C355;
  --sb-gold-deep:       #C07A10;
  --sb-gold-shadow:     #3D2800;

  /* Text */
  --sb-text-primary:    #F0F0F0;
  --sb-text-body:       #C8CDD0;
  --sb-text-muted:      #888E94;

  /* Borders */
  --sb-border:          #3A4248;
  --sb-border-subtle:   #2A3238;

  /* Semantic */
  --sb-win:             #00C49A;
  --sb-win-bg:          #0A3D30;
  --sb-loss:            #E84040;
  --sb-loss-bg:         #3D0A0A;
  --sb-pending:         #E8A020;
  --sb-pending-bg:      #3D2800;
}
```

---

## Colour Rules — Never Break These

1. **Teal is for action. Gold is for reward.** Never swap them. Teal buttons feel active. Gold badges feel earned.
2. **Never use teal and gold together on one element.** Adjacent is fine. Same button or badge — never. It reads festive, not powerful.
3. **Dark backgrounds only. No white screens.** A white background loses the Outlaw/Hero energy entirely.
4. **MEDALS token UI is always gold.** The MEDALS balance, the token name, the reward number — always `#E8A020`. It must feel like money, not data.
5. **Red is reserved for loss only.** Never use red for general warnings, pricing, or alerts. Red means you got it wrong — that specificity makes it hit harder.

---

*Document maintained by SportsBlock founders.*
