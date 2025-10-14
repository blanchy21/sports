<!-- af93a457-3db5-4b80-b258-c67ae87f4fcd e4a649fc-9f66-4c97-9802-698f9012941c -->
# Sports Arena Landing Page Implementation

## Overview

Build a comprehensive landing page with hero section, mission statement, blockchain explanation, and authentication - serving as the gateway to Sports Arena before users access the main feed.

## Key Changes

### 1. Route Restructuring

- Move current home page (`src/app/page.tsx`) content to `src/app/feed/page.tsx`
- Create new landing page at `src/app/page.tsx` for unauthenticated users
- Add route protection to redirect unauthenticated users to landing page

### 2. Landing Page Sections

**Hero Section:**

- Full-screen hero with `stadium.jpg` background image
- Overlay with gradient for text readability
- Main headline: "Sports Arena - Your Escape to Pure Sports Content"
- Subheadline explaining the mission (no politics, religion, or suffering - just sports)
- Prominent Sign Up and Login buttons

**Mission Section:**

- Card-based layout explaining the "why" behind Sports Arena
- Visual icons representing the problems being solved
- Clean, modern card designs with hover animations

**Blockchain Monetization Section:**

- Explain Hive blockchain integration
- Highlight earning potential ($0.50 - $200 per post based on engagement)
- Emphasize no premium requirements (contrast with X/Twitter model)
- Visual representation with animated counters or progress indicators

**Sport Filtering Section:**

- Showcase available sports with image cards (tennis, football, rugby, golf, american-football)
- Interactive grid showing sport categories
- Explain personalized content filtering

**Authentication Sections:**

- Inline auth cards showing both Hive and Guest access options
- Reuse existing `AuthModal` component functionality
- Display benefits of each authentication method

### 3. Technical Implementation

- Install `framer-motion` for advanced animations
- Add scroll-triggered animations (fade-in, slide-in)
- Implement parallax effects on hero section
- Use CSS animations for hover states and micro-interactions
- Ensure responsive design for all screen sizes

### 4. Auth Flow Updates

- Remove auto-login development code from `AuthContext.tsx`
- Update auth logic to redirect authenticated users from `/` to `/feed`
- Add middleware or client-side check for route protection

### 5. Files to Create/Modify

- `src/app/page.tsx` - New landing page
- `src/app/feed/page.tsx` - Move existing home content here
- `src/contexts/AuthContext.tsx` - Remove auto-login, add redirect logic
- `package.json` - Add framer-motion dependency

### To-dos

- [ ] Install framer-motion for advanced animations
- [ ] Remove auto-login code from AuthContext and add authentication redirect logic
- [ ] Move existing home page content from src/app/page.tsx to src/app/feed/page.tsx
- [ ] Build hero section with stadium.jpg background, headlines, and CTA buttons
- [ ] Create mission/why section explaining Sports Arena's purpose with animated cards
- [ ] Build blockchain monetization section explaining earnings and Hive integration
- [ ] Create sports filtering showcase with sport category cards using public images
- [ ] Build authentication sections integrating with existing AuthModal component
- [ ] Implement scroll animations, parallax effects, and micro-interactions throughout landing page
- [ ] Add redirect logic to send authenticated users from landing to /feed