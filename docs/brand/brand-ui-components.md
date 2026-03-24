# SportsBlock — UI Component System

> Implementation spec for Blanchy. All components use the brand colour tokens from `brand-colour-palette.md`
> and the font stack from `brand-typography.md`. Built on shadcn/ui + Tailwind CSS.  
> Last updated: March 2026

---

## Stack assumptions

- Next.js 15 / React 19 / TypeScript
- Tailwind CSS with custom `sb-*` colour tokens (see `brand-colour-palette.md`)
- shadcn/ui as the base primitive layer
- Fonts: Barlow Condensed (`--font-display`), Inter (`--font-body`), JetBrains Mono (`--font-mono`)

---

## 1. Buttons

### Variants

```tsx
// Primary — teal. All main CTAs.
<button className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-sb-teal text-[#051A14] font-body font-semibold text-sm tracking-wide hover:brightness-110 active:scale-[0.97] transition-all">
  Predict Now
</button>

// Gold — MEDALS stake actions only.
<button className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-sb-gold text-[#1A0A00] font-body font-semibold text-sm hover:brightness-110 active:scale-[0.97] transition-all">
  Stake MEDALS
</button>

// Outline — secondary actions.
<button className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-transparent text-sb-teal border border-sb-teal font-body font-semibold text-sm hover:bg-sb-teal/10 active:scale-[0.97] transition-all">
  View Pool
</button>

// Ghost — tertiary / nav actions.
<button className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-transparent text-sb-text-body border border-sb-border font-body font-medium text-sm hover:bg-sb-turf active:scale-[0.97] transition-all">
  Sign In
</button>

// Danger — destructive (withdraw, cancel stake).
<button className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-transparent text-sb-loss border border-sb-loss font-body font-semibold text-sm hover:bg-sb-loss/10 active:scale-[0.97] transition-all">
  Withdraw
</button>
```

### Size variants

| Size | Height | Padding | Font | Radius |
|------|--------|---------|------|--------|
| `sm` | `h-8` | `px-3.5` | `text-xs` | `rounded-md` |
| `md` (default) | `h-10` | `px-5` | `text-sm` | `rounded-lg` |
| `lg` | `h-12` | `px-7` | `text-base` | `rounded-[10px]` |

### Rules
- Only `btn-primary` (teal) and `btn-gold` use filled backgrounds
- Disabled state: `opacity-40 pointer-events-none`
- Never mix teal and gold on the same button
- Icon-only buttons: square, `w-10 h-10`, `justify-center`

---

## 2. Badges & Status Pills

```tsx
// Live indicator (animated dot)
<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-sb-teal/12 text-sb-teal border border-sb-teal/25 tracking-wide">
  <span className="w-1.5 h-1.5 rounded-full bg-sb-teal animate-pulse" />
  LIVE
</span>

// Correct prediction
<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-sb-win-bg text-sb-win border border-sb-win/30 tracking-wide">
  ✓ CORRECT
</span>

// Wrong prediction
<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-sb-loss-bg text-sb-loss border border-sb-loss/30 tracking-wide">
  ✗ WRONG
</span>

// Pending result
<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-sb-pending-bg text-sb-pending border border-sb-pending/30 tracking-wide">
  ⏳ PENDING
</span>

// MEDALS amount — always monospace + gold
<span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-sb-gold/12 text-sb-gold border border-sb-gold/25 font-mono">
  4,820.00 MEDALS
</span>
```

### MEDALS Rank Tier Badges

```tsx
const TIER_STYLES = {
  rookie:      'text-sb-text-body border-sb-border',
  contender:   'text-sb-teal border-sb-teal/25',
  analyst:     'text-sb-teal-flash border-sb-teal-flash/30',
  pundit:      'text-sb-gold border-sb-gold/30',
  legend:      'text-sb-gold-shine border-sb-gold-shine/35',
  halloffame:  'text-sb-gold-shine border-sb-gold-shine/40 bg-gradient-to-r from-sb-gold/20 to-sb-gold-shine/15',
}

<span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-sb-turf border tracking-wide ${TIER_STYLES[tier]}`}>
  {tierLabel}
</span>
```

| Tier | MEDALS range | Colour |
|------|-------------|--------|
| Rookie | 0 – 999 | `#C8CDD0` |
| Contender | 1,000 – 4,999 | `#00C49A` |
| Analyst | 5,000 – 14,999 | `#00E5B4` |
| Pundit | 15,000 – 49,999 | `#E8A020` |
| Legend | 50,000 – 199,999 | `#F5C355` |
| Hall of Fame | 200,000+ | `#F5C355` + gradient bg |

---

## 3. Form Inputs

```tsx
// Standard text input
<input
  type="text"
  placeholder="@username"
  className="w-full h-10 px-3.5 rounded-lg bg-sb-stadium border border-sb-border text-sb-text-primary font-body text-sm placeholder:text-sb-border focus:border-sb-teal focus:outline-none transition-colors"
/>

// MEDALS stake input — monospace, gold tint
<div className="relative">
  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-sb-gold pointer-events-none">
    MEDALS
  </span>
  <input
    type="number"
    placeholder="0.00"
    className="w-full h-12 pl-[60px] pr-3.5 rounded-lg bg-sb-stadium border border-sb-gold/30 text-sb-gold font-mono text-base focus:border-sb-gold focus:outline-none transition-colors"
  />
</div>
```

---

## 4. Prediction Card

```tsx
type PredictionOption = {
  label: string   // "HOME WIN" | "DRAW" | "AWAY WIN"
  name: string    // Team name or "Draw"
  odds: string    // "+2.4×"
  staked: number  // Number of stakers
}

type PredictionCardProps = {
  homeTeam: string
  awayTeam: string
  competition: string
  matchday: string
  kickoff: string
  status: 'upcoming' | 'live' | 'closed'
  options: PredictionOption[]
  poolTotal: number         // MEDALS
  onStake: (option: string) => void
}
```

```tsx
// Structure
<div className="bg-sb-stadium border border-sb-border-subtle rounded-xl overflow-hidden">

  {/* Header */}
  <div className="bg-sb-pitch px-4 py-3 flex items-center justify-between">
    <div>
      <h3 className="font-display font-bold text-xl text-sb-text-primary tracking-tight">
        {homeTeam} vs {awayTeam}
      </h3>
      <p className="text-[11px] text-sb-text-muted mt-0.5">
        {competition} · {matchday} · Kick-off {kickoff}
      </p>
    </div>
    <LiveBadge status={status} />
  </div>

  {/* Options grid — always 3 columns */}
  <div className="grid grid-cols-3 gap-2 p-3">
    {options.map(opt => (
      <button
        key={opt.label}
        onClick={() => setSelected(opt.label)}
        className={cn(
          "bg-sb-turf border rounded-lg p-3 text-center transition-colors",
          selected === opt.label
            ? "border-sb-teal bg-sb-teal/10"
            : "border-sb-border hover:border-sb-teal hover:bg-sb-teal/6"
        )}
      >
        <p className="text-[10px] text-sb-text-muted tracking-wide mb-1">{opt.label}</p>
        <p className="font-display font-bold text-base text-sb-text-primary">{opt.name}</p>
        <p className="font-mono text-[15px] text-sb-teal mt-0.5">{opt.odds}</p>
        <p className="text-[10px] text-sb-text-muted mt-0.5">{opt.staked} staked</p>
      </button>
    ))}
  </div>

  {/* Footer */}
  <div className="px-4 pb-3.5 pt-2 flex items-center gap-3 border-t border-sb-border-subtle">
    <p className="text-xs text-sb-text-muted flex-1">
      Pool: <span className="font-mono text-sb-gold">{poolTotal.toLocaleString()} MEDALS</span>
    </p>
    <Button size="sm" variant="primary" onClick={() => onStake(selected)}>
      Stake MEDALS
    </Button>
  </div>

</div>
```

---

## 5. Prediction Result Card

```tsx
// Win variant
<div className="bg-sb-win-bg border border-sb-teal/30 rounded-xl overflow-hidden">
  <div className="px-4 py-3 flex items-center justify-between bg-black/20">
    <div>
      <p className="font-display font-bold text-xl text-sb-text-primary">{matchName}</p>
      <p className="text-[11px] text-[#9FE1CB]">Full time</p>
    </div>
    <p className="font-display font-extrabold text-[26px] text-sb-teal">{score}</p>
  </div>
  <div className="px-4 pb-3.5 pt-2.5 flex items-center justify-between">
    <div>
      <p className="text-[13px] text-[#9FE1CB]">Your pick: {pick}</p>
      <CorrectBadge className="mt-1.5" />
    </div>
    <div className="text-right">
      <p className="font-mono text-xl text-sb-teal">+{earned.toLocaleString()}</p>
      <p className="text-[10px] text-[#9FE1CB] mt-0.5">MEDALS earned</p>
    </div>
  </div>
</div>

// Loss variant: swap sb-win-bg → sb-loss-bg, sb-teal → sb-loss, #9FE1CB → #F09595
```

---

## 6. Leaderboard Row

```tsx
type LeaderboardRowProps = {
  rank: number
  username: string
  tier: TierKey
  medals: number
  weeklyChange: number   // positive or negative
  isCurrentUser?: boolean
}

// Rank number colour by position
const rankStyle = {
  1: 'bg-[rgba(245,195,85,0.18)] text-[#F5C355]',
  2: 'bg-[rgba(200,205,208,0.12)] text-[#C8CDD0]',
  3: 'bg-[rgba(205,140,60,0.14)] text-[#CD8C3C]',
}

<div className={cn(
  "flex items-center gap-3 px-4 py-2.5 border-b border-sb-border-subtle last:border-0 transition-colors cursor-pointer hover:bg-sb-turf",
  isCurrentUser && "bg-sb-teal/4 border-l-2 border-l-sb-teal"
)}>
  {/* Rank */}
  <div className={cn("w-6.5 h-6.5 rounded-md flex items-center justify-center font-display font-bold text-base flex-shrink-0", rankStyle[rank] ?? 'bg-sb-turf text-sb-text-muted')}>
    {rank}
  </div>

  {/* Avatar */}
  <div className="w-8 h-8 rounded-full bg-sb-turf border border-sb-teal/25 flex items-center justify-center text-xs font-semibold text-sb-teal flex-shrink-0">
    {username.slice(0,2).toUpperCase()}
  </div>

  {/* Info */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-sb-text-primary truncate">@{username}</p>
    <TierBadge tier={tier} />
  </div>

  {/* MEDALS + change */}
  <div className="text-right flex-shrink-0">
    <p className="font-mono text-sm text-sb-gold">{medals.toLocaleString()}</p>
    <p className={cn("text-[11px]", weeklyChange >= 0 ? "text-sb-teal" : "text-sb-loss")}>
      {weeklyChange >= 0 ? '+' : ''}{weeklyChange.toLocaleString()} {weeklyChange >= 0 ? '↑' : '↓'}
    </p>
  </div>
</div>
```

---

## 7. Content Post Card

```tsx
<article className="bg-sb-stadium border border-sb-border-subtle rounded-xl overflow-hidden">

  {/* Author header */}
  <div className="flex items-center gap-2.5 px-4 py-3">
    <div className="w-9 h-9 rounded-full bg-sb-turf border border-sb-teal/20 flex items-center justify-center text-xs font-semibold text-sb-teal flex-shrink-0">
      {initials}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-sb-text-primary">@{username}</span>
        <TierBadge tier={tier} />
      </div>
      <p className="text-[11px] text-sb-text-muted">{timeAgo} · {sport}</p>
    </div>
  </div>

  {/* Body */}
  <div className="px-4 pb-3 text-sm text-sb-text-body leading-relaxed font-body">
    {content}
  </div>

  {/* Footer actions */}
  <div className="px-4 py-2.5 border-t border-sb-border-subtle flex items-center gap-4">
    <button className="flex items-center gap-1.5 text-xs text-sb-text-muted hover:text-sb-teal transition-colors">
      <UpvoteIcon className="w-3.5 h-3.5" />
      {upvotes}
    </button>
    <button className="flex items-center gap-1.5 text-xs text-sb-text-muted hover:text-sb-teal transition-colors">
      <CommentIcon className="w-3.5 h-3.5" />
      {comments}
    </button>
    <span className="ml-auto font-mono text-xs text-sb-gold">+{hiveReward} HIVE</span>
  </div>

</article>
```

---

## 8. Number formatting

Always use these helpers for financial/numerical display:

```typescript
// MEDALS balance — monospace, gold, 2dp
export const formatMedals = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// HIVE reward — 3dp
export const formatHive = (n: number) =>
  n.toFixed(3)

// Odds multiplier
export const formatOdds = (n: number) =>
  `+${n.toFixed(1)}×`

// Leaderboard rank change
export const formatChange = (n: number) =>
  `${n >= 0 ? '+' : ''}${n.toLocaleString()} ${n >= 0 ? '↑' : '↓'}`
```

**Always use `font-feature-settings: 'tnum' 1` on any element displaying scores, MEDALS balances, or leaderboard numbers** to prevent layout shift as numbers update live.

---

## 9. Global CSS additions (globals.css)

```css
/* Tabular numbers on all mono elements */
.font-mono {
  font-feature-settings: 'tnum' 1, 'zero' 1;
}

/* Smooth transitions on interactive components */
.pred-opt {
  transition: border-color 150ms ease, background-color 150ms ease;
}

/* Live dot pulse */
@keyframes sb-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}
.animate-sb-pulse {
  animation: sb-pulse 1.4s ease-in-out infinite;
}
```

---

*Document maintained by SportsBlock founders. Pass to Blanchy for implementation.*
