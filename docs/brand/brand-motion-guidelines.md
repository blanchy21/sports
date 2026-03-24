# SportsBlock — Motion & Animation Guidelines

> Implementation spec for Blanchy. All animations use `transform` and `opacity` only — no layout properties.  
> Last updated: March 2026

---

## Philosophy

Motion in SportsBlock serves one purpose: **making outcomes feel real**.

A correct prediction should feel like a win — not a data refresh. A MEDALS balance increasing should feel like money landing in your account. A live match card should feel alive. Every animation either confirms an action, communicates a state, or builds anticipation. Never decorative. Never slow.

---

## 1. Easing Curves

Five named curves. Use the right one for the right moment.

| Name | Value | Use |
|------|-------|-----|
| **Snap** | `cubic-bezier(0.4, 0, 0.2, 1)` | Default for all UI transitions. Enters fast, settles smooth. |
| **Spring** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Notifications, result reveals, win states. Slight overshoot = feels alive. |
| **Exit** | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving screen. Fast out, no bounce. |
| **Enter** | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering screen. Decelerates to rest. |
| **Smooth** | `ease-in-out` | Long-running transitions — counter increments, progress bars. |
| **Linear** | `linear` | Looping animations only — live dot pulse, skeleton shimmer. |

```css
/* globals.css — curve tokens */
:root {
  --ease-snap:   cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-exit:   cubic-bezier(0.4, 0, 1, 1);
  --ease-enter:  cubic-bezier(0, 0, 0.2, 1);
}
```

---

## 2. Duration Scale

| Token | Duration | Use |
|-------|----------|-----|
| `--dur-instant` | `80ms` | Colour swaps, border changes |
| `--dur-micro` | `150ms` | Hover states, focus rings |
| `--dur-fast` | `250ms` | State changes (correct/wrong badge) |
| `--dur-base` | `350ms` | Enter/exit transitions, modals |
| `--dur-deliberate` | `500ms` | Result reveals, major state changes |
| `--dur-reveal` | `800ms` | MEDALS counter increment |
| `--dur-loop` | `1400ms` | Live dot pulse |

```css
:root {
  --dur-instant:    80ms;
  --dur-micro:      150ms;
  --dur-fast:       250ms;
  --dur-base:       350ms;
  --dur-deliberate: 500ms;
  --dur-reveal:     800ms;
  --dur-loop:       1400ms;
}
```

---

## 3. Component Animations

### Button press

```css
.btn {
  transition:
    filter var(--dur-micro) var(--ease-snap),
    transform 100ms var(--ease-snap);
}
.btn:hover  { filter: brightness(1.08); }
.btn:active { transform: scale(0.97); filter: brightness(0.95); }
```

For programmatic trigger (e.g. after async confirm):
```css
@keyframes sb-btn-press {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.96); }
  100% { transform: scale(1); }
}
```

---

### Prediction option select

```css
.pred-opt {
  transition:
    border-color var(--dur-micro) var(--ease-snap),
    background-color var(--dur-micro) var(--ease-snap),
    transform 120ms var(--ease-snap);
}
.pred-opt.selected {
  border-color: #00C49A;
  background: rgba(0, 196, 154, 0.1);
  transform: scale(1.03);
}
```

---

### Win notification (slide down)

```css
.notification {
  transform: translateY(-64px);
  opacity: 0;
  transition:
    transform 400ms var(--ease-spring),
    opacity 300ms var(--ease-enter);
}
.notification.visible {
  transform: translateY(0);
  opacity: 1;
}
```

**Rules:**
- Win notifications use Spring easing — the overshoot makes it feel celebratory
- Loss notifications use Snap — a bounce on a loss feels tone-deaf
- Auto-dismiss after 3200ms with Exit easing fade-out

---

### Match result reveal

```css
.result-card {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
  transition:
    opacity var(--dur-base) var(--ease-snap),
    transform var(--dur-base) var(--ease-spring);
}
.result-card.revealed {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

---

### Card mount / list stagger

```css
.card {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 280ms var(--ease-snap),
    transform 280ms var(--ease-snap);
}
.card.mounted {
  opacity: 1;
  transform: translateY(0);
}
```

```tsx
// Stagger in React — 60ms between each item
useEffect(() => {
  items.forEach((_, i) => {
    setTimeout(() => setMounted(prev => [...prev, i]), i * 60)
  })
}, [])
```

---

### MEDALS balance counter

Always animate from the previous value to the new value. Never jump.

```tsx
function useMedalsCounter(target: number, duration = 800) {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)

  useEffect(() => {
    const start = prevRef.current
    const startTime = performance.now()

    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      // Smooth ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress
      setDisplay(start + (target - start) * eased)
      if (progress < 1) requestAnimationFrame(step)
      else prevRef.current = target
    }

    requestAnimationFrame(step)
  }, [target])

  return display
}

// Usage
const medals = useMedalsCounter(userMedals)

<span className={cn(
  "font-mono text-sb-gold transition-colors duration-200",
  isAnimating && "text-sb-gold-shine" // Flash brighter during count
)}>
  {medals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
</span>
```

---

### Live dot pulse

```css
@keyframes sb-live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(0.85); }
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00C49A;
  animation: sb-live-pulse var(--dur-loop) ease-in-out infinite;
}
```

---

### Skeleton loading shimmer

```css
@keyframes sb-shimmer {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1; }
}

.skeleton {
  background: #1E2A2F;
  border-radius: 4px;
  animation: sb-shimmer 1600ms ease-in-out infinite;
}

/* Stagger skeleton rows slightly */
.skeleton:nth-child(2) { animation-delay: 150ms; }
.skeleton:nth-child(3) { animation-delay: 300ms; }
```

---

### Prediction stake submit (spinner)

The only place a spinner is used — during the async Hive blockchain write.

```css
@keyframes sb-spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(5, 26, 20, 0.25);
  border-top-color: #051A14;
  border-radius: 50%;
  animation: sb-spin 700ms linear infinite;
}
```

Button loading state:
```tsx
<button className="btn btn-primary" disabled={isSubmitting}>
  {isSubmitting
    ? <><span className="spinner" /> Staking…</>
    : 'Stake MEDALS'
  }
</button>
```

---

## 4. Framer Motion — Page Transitions

```tsx
// variants/motion.ts
export const pageVariants = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit:     { opacity: 0, y: -8, transition: { duration: 0.2,  ease: [0.4, 0, 1, 1] } },
}

export const listVariants = {
  animate: { transition: { staggerChildren: 0.06 } }
}

export const itemVariants = {
  initial:  { opacity: 0, y: 12 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
}

// Usage
<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
  <motion.ul variants={listVariants} animate="animate">
    {items.map(item => (
      <motion.li key={item.id} variants={itemVariants}>{item}</motion.li>
    ))}
  </motion.ul>
</motion.div>
```

---

## 5. Tailwind Config — Animation Tokens

```typescript
// tailwind.config.ts
extend: {
  transitionTimingFunction: {
    'snap':   'cubic-bezier(0.4, 0, 0.2, 1)',
    'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'exit':   'cubic-bezier(0.4, 0, 1, 1)',
    'enter':  'cubic-bezier(0, 0, 0.2, 1)',
  },
  transitionDuration: {
    '80':  '80ms',
    '350': '350ms',
    '500': '500ms',
    '800': '800ms',
  },
  animation: {
    'sb-pulse':   'sb-live-pulse 1400ms ease-in-out infinite',
    'sb-shimmer': 'sb-shimmer 1600ms ease-in-out infinite',
    'sb-spin':    'sb-spin 700ms linear infinite',
  },
  keyframes: {
    'sb-live-pulse': {
      '0%, 100%': { opacity: '1', transform: 'scale(1)' },
      '50%':      { opacity: '0.35', transform: 'scale(0.85)' },
    },
    'sb-shimmer': {
      '0%, 100%': { opacity: '0.4' },
      '50%':      { opacity: '1' },
    },
    'sb-spin': {
      to: { transform: 'rotate(360deg)' },
    },
  },
}
```

---

## 6. Rules — Never Break These

1. **`transform` and `opacity` only.** Never animate `width`, `height`, `top`, `left`, `padding`, or any layout property. GPU composited only — no reflow.

2. **Respect reduced motion.** Every `@keyframes` animation must be wrapped:
   ```css
   @media (prefers-reduced-motion: no-preference) {
     .live-dot { animation: sb-live-pulse 1400ms ease-in-out infinite; }
   }
   ```
   Transitions can remain but halve their duration.

3. **Spring easing on wins only.** The overshoot bounce communicates celebration. Never use Spring on loss states, errors, or neutral transitions.

4. **Stagger list items at 60ms intervals.** Never mount all items simultaneously — it reads as a flash. Stagger creates sequence and implies content loading progressively.

5. **MEDALS never jumps.** Always animate from previous to new value. Use `useMedalsCounter` hook for every balance display.

6. **Spinners only during blockchain writes.** All other loading states use skeleton shimmer. Spinners are reserved for the specific moment a Hive transaction is being broadcast.

7. **No animation on disabled elements.** `pointer-events: none` and no transition. Static and obviously inert.

---

*Document maintained by SportsBlock founders. Pass to Blanchy for implementation.*
