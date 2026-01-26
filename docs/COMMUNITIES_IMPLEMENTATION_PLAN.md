# Sportsblock Communities Feature - Implementation Plan

> *"The people who are crazy enough to think they can change the world are the ones who do."*

## Executive Vision

Sportsblock Communities will be a **hybrid system** that combines the best of both worlds:
- **Sportsblock-native storage** (Firebase/Firestore) for flexibility and accessibility
- **Optional Hive blockchain integration** for verified communities and cross-platform visibility

This allows **both Hive users and non-blockchain users** (soft auth) to participate equally, while providing a path for communities to gain blockchain verification and permanence.

---

## Part 1: Research Findings

### Hive Blockchain Communities (Hivemind)

The Hive blockchain's social layer is managed by **Hivemind**, a microservice that:
- Processes irreversible blocks for data consistency
- Stores community data in PostgreSQL
- Exposes a JSON-RPC API via PostgREST

**Key Hive Community APIs:**
| API Method | Purpose |
|------------|---------|
| `bridge.list_communities` | List communities with filters (rank/new/subs) |
| `bridge.get_community` | Get community details including role/subscription |
| `bridge.get_community_context` | User's role and subscription status |
| `bridge.list_subscribers` | Paginated member list with roles |
| `bridge.list_community_roles` | All roles and labels |
| `bridge.list_all_subscriptions` | User's subscriptions across communities |

**Hive Community Data Model:**
```typescript
{
  id: number,           // Numeric community ID
  name: string,         // e.g., "hive-115814"
  title: string,        // Display name
  about: string,        // Description
  subscribers: number,  // Member count
  num_pending: number,  // Pending members
  num_authors: number,  // Unique posters
  created_at: string,   // ISO timestamp
  avatar_url: string,
  team: [{
    role: 'admin' | 'mod' | 'member',
    name: string,       // Hive username
    title: string       // Custom title/badge
  }]
}
```

**Key Insight:** Hive communities use `custom_json` operations broadcast to the blockchain for actions like subscribe, unsubscribe, and role changes. This requires active keys and is inherently Hive-user-only.

---

## Part 2: Current Sportsblock Implementation Status

### Already Built (Backend Complete)

| Component | Status | Location |
|-----------|--------|----------|
| TypeScript Types | Complete | [src/types/index.ts](src/types/index.ts) |
| Firebase Admin CRUD | Complete | [src/lib/firebase/communities-admin.ts](src/lib/firebase/communities-admin.ts) |
| Zustand Store | Complete | [src/stores/communityStore.ts](src/stores/communityStore.ts) |
| Security Rules | Complete | [firestore.rules](firestore.rules) |
| API Routes | Partial | `src/app/api/communities/*` |
| React Query Hooks | Complete | `src/lib/react-query/queries/useCommunity.ts` |

### Not Built (UI Layer Missing)

| Component | Status | Priority |
|-----------|--------|----------|
| Community Discovery Page | Not Started | P0 |
| Community Detail Page | Not Started | P0 |
| Community Feed (Posts) | Not Started | P0 |
| Create Community Form | Not Started | P0 |
| User's Communities Dashboard | Not Started | P1 |
| Member Management Panel | Not Started | P1 |
| Community Settings Page | Not Started | P1 |
| Invitation System UI | Not Started | P2 |
| Community Search/Filters | Not Started | P2 |

---

## Part 3: Architecture Design

### 3.1 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  React Components  →  Zustand Store  →  React Query Hooks       │
│       (UI)            (Local State)      (Server State)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  /api/communities/*           Authorization & Validation         │
│  /api/communities/[id]/*      Rate Limiting                     │
│  /api/communities/[id]/posts  Request Context                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  FirebaseCommunitiesAdmin     Firebase Admin SDK                │
│  (Bypass Security Rules)      (Server-Side Only)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Firestore Collections:                                         │
│  • communities          (Community metadata)                    │
│  • community_members    (Membership records)                    │
│  • community_invites    (Pending invitations)                   │
│  • community_posts      (NEW: Posts linked to communities)      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 User Authentication Support Matrix

| Feature | Soft Auth (Firebase) | Hive Auth (Aioha) |
|---------|---------------------|-------------------|
| View public communities | Yes | Yes |
| View private communities | If member | If member |
| Join public communities | Yes | Yes |
| Join private communities | Request/Invite | Request/Invite |
| Create communities | Yes | Yes |
| Admin communities | Yes | Yes |
| Post to communities | Firestore only | Hive blockchain + Firestore |
| Community verification | No | Yes (future) |

### 3.3 Community Types

1. **Public** - Anyone can view and join instantly
2. **Private** - Visible but requires approval to join
3. **Invite-Only** - Hidden, requires invitation to see or join

### 3.4 Membership Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full control: settings, roles, bans, delete community |
| **Moderator** | Manage posts, approve members, mute users |
| **Member** | View, post, comment (based on community settings) |

---

## Part 4: Implementation Phases

### Phase 1: Foundation (P0 - Core Experience)

**Goal:** Users can discover, view, and join communities

#### 1.1 Community Discovery Page
**Route:** `/communities`

```
┌─────────────────────────────────────────────────────────────┐
│ [Search communities...]        [Sport ▼] [Type ▼] [Sort ▼] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ [Avatar]    │ │ [Avatar]    │ │ [Avatar]    │            │
│ │ NFL Fans    │ │ Soccer UK   │ │ NBA Daily   │            │
│ │ 1.2k members│ │ 890 members │ │ 2.1k members│            │
│ │ [Join]      │ │ [Joined ✓]  │ │ [Join]      │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ ...         │ │ ...         │ │ ...         │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                    [Load More]                              │
└─────────────────────────────────────────────────────────────┘
```

**Components to Build:**
- `CommunityCard` - Grid card with avatar, name, stats, join button
- `CommunityList` - Grid layout with infinite scroll
- `CommunityFilters` - Search, sport category, type, sort dropdowns
- `CommunityDiscoveryPage` - Full page composition

**Files to Create:**
```
src/components/communities/
├── CommunityCard.tsx
├── CommunityList.tsx
├── CommunityFilters.tsx
├── CommunityDiscoveryPage.tsx
└── index.ts

src/app/communities/
├── page.tsx
└── loading.tsx
```

#### 1.2 Community Detail Page
**Route:** `/communities/[slug]`

```
┌─────────────────────────────────────────────────────────────┐
│ [Cover Image                                               ]│
│ ┌────────┐                                                  │
│ │ Avatar │  NFL Fans                    [Join] [Settings ⚙]│
│ └────────┘  Football • 1.2k members • 342 posts            │
│             Created by @sportsfan • Verified ✓              │
├─────────────────────────────────────────────────────────────┤
│ [Posts] [Members] [About] [Rules]                          │
├─────────────────────────────────────────────────────────────┤
│ POSTS TAB:                                                  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [Post Card]                                             ││
│ │ NFL Week 15 Predictions Thread                          ││
│ │ @user123 • 2h ago • 45 upvotes • 23 comments           ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [Post Card]                                             ││
│ │ ...                                                     ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components to Build:**
- `CommunityHeader` - Cover, avatar, name, stats, actions
- `CommunityTabs` - Posts/Members/About/Rules navigation
- `CommunityPosts` - Posts feed filtered by community
- `CommunityMembers` - Member list with roles
- `CommunityAbout` - Description, rules, sport category
- `CommunityDetailPage` - Full page composition

**Files to Create:**
```
src/components/communities/
├── CommunityHeader.tsx
├── CommunityTabs.tsx
├── CommunityPosts.tsx
├── CommunityMembers.tsx
├── CommunityAbout.tsx
├── CommunityDetailPage.tsx
└── JoinButton.tsx

src/app/communities/[slug]/
├── page.tsx
├── loading.tsx
└── not-found.tsx
```

#### 1.3 Create Community Flow
**Route:** `/communities/create`

```
┌─────────────────────────────────────────────────────────────┐
│                    Create Your Community                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Community Name *                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ e.g., NFL Fantasy League                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  URL Slug                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ nfl-fantasy-league (auto-generated)                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Sport Category *                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [🏈 American Football ▼]                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Short Description *                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ A community for NFL fantasy football enthusiasts...     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Community Type *                                            │
│  ○ Public - Anyone can join                                 │
│  ○ Private - Approval required                              │
│  ○ Invite-Only - Hidden, invite required                    │
│                                                              │
│  [Avatar Upload]        [Cover Image Upload]                │
│                                                              │
│  Rules & Guidelines (optional)                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Rich text editor...                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│              [Cancel]              [Create Community]        │
└─────────────────────────────────────────────────────────────┘
```

**Components to Build:**
- `CreateCommunityForm` - Multi-step form with validation
- `SportCategorySelect` - Dropdown with icons
- `CommunityTypeSelector` - Radio group with descriptions
- `ImageUploader` - Avatar and cover image upload
- `RulesEditor` - Rich text for community guidelines

**Files to Create:**
```
src/components/communities/
├── CreateCommunityForm.tsx
├── SportCategorySelect.tsx
├── CommunityTypeSelector.tsx
└── ImageUploader.tsx

src/app/communities/create/
└── page.tsx
```

#### 1.4 Community Posts Integration

**Data Model Extension:**
```typescript
// Extend SportsblockPost type
interface CommunityPost extends SportsblockPost {
  communityId?: string;
  communitySlug?: string;
  communityName?: string;
}
```

**API Changes:**
- Add `communityId` to soft_posts collection
- Create `/api/communities/[id]/posts` endpoint
- Update post creation to accept optional community

---

### Phase 2: Engagement (P1 - User Experience)

**Goal:** Users can manage their communities and engage with members

#### 2.1 User's Communities Dashboard
**Route:** `/dashboard/communities` or sidebar widget

```
┌─────────────────────────────────────────────────────────────┐
│ MY COMMUNITIES                           [+ Create New]     │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Avatar] NFL Fans           Admin    [Manage →]       │  │
│ │          12 new posts today                           │  │
│ └───────────────────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Avatar] Soccer UK          Member   [View →]         │  │
│ │          3 pending requests                           │  │
│ └───────────────────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Avatar] NBA Daily          Mod      [Manage →]       │  │
│ │          Active now                                   │  │
│ └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ SUGGESTED FOR YOU                                           │
│ ┌─────────────┐ ┌─────────────┐                            │
│ │ Tennis UK   │ │ F1 Racing   │                            │
│ │ [Join]      │ │ [Join]      │                            │
│ └─────────────┘ └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Components to Build:**
- `UserCommunitiesList` - List with role badges
- `CommunityQuickStats` - New posts, pending requests
- `SuggestedCommunities` - Recommendations based on activity

#### 2.2 Community Admin Panel
**Route:** `/communities/[slug]/settings`

```
┌─────────────────────────────────────────────────────────────┐
│ Community Settings - NFL Fans                               │
├─────────────────────────────────────────────────────────────┤
│ [General] [Members] [Moderation] [Invites] [Danger Zone]    │
├─────────────────────────────────────────────────────────────┤
│ MEMBERS TAB:                                                │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Search members...                        [Invite User] ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ PENDING REQUESTS (3)                                        │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ @newuser1    Requested 2h ago    [Approve] [Deny]      ││
│ │ @newuser2    Requested 1d ago    [Approve] [Deny]      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ MEMBERS (1,247)                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ @sportsfan   Admin     Creator   [Make Mod] [Remove]   ││
│ │ @nflfan99    Moderator           [Make Admin] [Remove] ││
│ │ @user123     Member              [Make Mod] [Ban]      ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components to Build:**
- `CommunitySettingsPage` - Tabbed settings layout
- `CommunityGeneralSettings` - Name, description, type
- `CommunityMembersPanel` - Member list with actions
- `PendingRequestsList` - Approve/deny requests
- `MemberRoleActions` - Role change dropdowns
- `InviteUserModal` - Email or Hive username invite

#### 2.3 Member Management API Extensions

**New API Endpoints:**
```
GET    /api/communities/[id]/members?status=pending
POST   /api/communities/[id]/members/[userId]/approve
POST   /api/communities/[id]/members/[userId]/ban
PATCH  /api/communities/[id]/members/[userId]/role
DELETE /api/communities/[id]/members/[userId]
```

---

### Phase 3: Growth (P2 - Advanced Features)

**Goal:** Communities can grow and maintain quality

#### 3.1 Invitation System

**Invite Flow:**
1. Admin creates invite (email or Hive username)
2. System sends notification/email
3. Invitee clicks link → auto-joins if authenticated
4. Invites expire after 7 days

**Components:**
- `InviteUserModal` - Create invites
- `PendingInvitesList` - View/revoke invites
- `InviteAcceptPage` - `/invite/[inviteId]`

#### 3.2 Community Search & Discovery Enhancements

**Features:**
- Full-text search across name, description, tags
- "Trending" communities (most growth this week)
- "Recommended" based on user's sport interests
- "Near you" for location-based sports (future)

#### 3.3 Community Moderation Tools

**Features:**
- Post approval queue for moderated communities
- Mute/unmute members (can read but not post)
- Content flags/reports
- Auto-mod rules (spam detection)

---

### Phase 4: Blockchain Bridge (P3 - Future)

**Goal:** Verified communities with Hive integration

#### 4.1 Hive Community Verification

**Process:**
1. Community admin links their Hive account
2. Admin creates matching Hive community (if doesn't exist)
3. System verifies ownership via signed message
4. Community gets "Verified" badge

**Benefits:**
- Posts can be cross-posted to Hive blockchain
- Community appears in Hive explorers (PeakD, etc.)
- Members earn HIVE/HBD rewards

#### 4.2 Cross-Platform Sync

**Sync Strategy:**
- Sportsblock remains source of truth for membership
- Posts by Hive users are mirrored to blockchain
- Comments sync bidirectionally
- Votes sync to Hive (for Hive members)

---

## Part 5: Technical Specifications

### 5.1 New/Modified Types

```typescript
// src/types/community.ts

// Extend Post to include community context
export interface CommunityPost {
  postType: 'community';
  communityId: string;
  communitySlug: string;
  communityName: string;
  // ... existing Post fields
}

// Community member with extended info
export interface CommunityMemberWithUser extends CommunityMember {
  user?: Pick<User, 'id' | 'username' | 'avatar' | 'hiveUsername'>;
}

// Community with membership context (for current user)
export interface CommunityWithContext extends Community {
  userMembership?: {
    role: CommunityMemberRole;
    status: CommunityMemberStatus;
    joinedAt: Date;
  };
  isJoined: boolean;
  canPost: boolean;
  canModerate: boolean;
  canAdmin: boolean;
}

// Activity feed for community dashboard
export interface CommunityActivity {
  id: string;
  communityId: string;
  type: 'new_member' | 'new_post' | 'member_left' | 'role_change';
  actorId: string;
  actorUsername: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
```

### 5.2 New Firestore Collections

```typescript
// community_posts (links posts to communities)
{
  postId: string;           // Reference to soft_posts
  communityId: string;      // Reference to communities
  authorId: string;
  createdAt: Timestamp;
  isPinned: boolean;
  isModerated: boolean;
}

// community_activity (activity feed)
{
  communityId: string;
  type: string;
  actorId: string;
  metadata: Map;
  createdAt: Timestamp;
}
```

### 5.3 New Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "communities",
      "fields": [
        { "fieldPath": "sportCategory", "order": "ASCENDING" },
        { "fieldPath": "memberCount", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "community_posts",
      "fields": [
        { "fieldPath": "communityId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "community_members",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 5.4 React Query Hooks to Add

```typescript
// User's communities
useUserCommunities(userId: string)

// Community with user context
useCommunityWithContext(slug: string, userId?: string)

// Community posts feed
useCommunityPosts(communityId: string, options?: {
  sort?: 'new' | 'hot' | 'top';
  timeRange?: 'day' | 'week' | 'month' | 'all';
})

// Pending join requests (for admins)
usePendingMembers(communityId: string)

// Community activity feed
useCommunityActivity(communityId: string)

// Mutations
useCreateCommunity()
useUpdateCommunity()
useDeleteCommunity()
useJoinCommunity()
useLeaveCommunity()
useApproveMember()
useBanMember()
useUpdateMemberRole()
useCreateInvite()
useAcceptInvite()
```

### 5.5 Component Directory Structure

```
src/components/communities/
├── discovery/
│   ├── CommunityDiscoveryPage.tsx
│   ├── CommunityCard.tsx
│   ├── CommunityList.tsx
│   ├── CommunityFilters.tsx
│   └── CommunitySearch.tsx
│
├── detail/
│   ├── CommunityDetailPage.tsx
│   ├── CommunityHeader.tsx
│   ├── CommunityTabs.tsx
│   ├── CommunityPosts.tsx
│   ├── CommunityMembers.tsx
│   ├── CommunityAbout.tsx
│   └── CommunityRules.tsx
│
├── create/
│   ├── CreateCommunityPage.tsx
│   ├── CreateCommunityForm.tsx
│   ├── SportCategorySelect.tsx
│   └── CommunityTypeSelector.tsx
│
├── manage/
│   ├── CommunitySettingsPage.tsx
│   ├── GeneralSettings.tsx
│   ├── MembersPanel.tsx
│   ├── PendingRequests.tsx
│   ├── InvitesPanel.tsx
│   └── DangerZone.tsx
│
├── shared/
│   ├── JoinButton.tsx
│   ├── MemberBadge.tsx
│   ├── CommunityAvatar.tsx
│   ├── CommunityTypeBadge.tsx
│   └── VerifiedBadge.tsx
│
├── dashboard/
│   ├── UserCommunitiesList.tsx
│   ├── CommunityQuickStats.tsx
│   └── SuggestedCommunities.tsx
│
└── index.ts
```

---

## Part 6: UI/UX Design Principles

### 6.1 Visual Hierarchy

1. **Community Identity** - Avatar and name are always prominent
2. **Action Clarity** - Join/Leave buttons are always visible
3. **Role Visibility** - Admin/Mod badges are subtle but clear
4. **Stats at a Glance** - Member count, post count easily scannable

### 6.2 Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Mobile (<640px) | Single column, stacked cards |
| Tablet (640-1024px) | 2-column grid |
| Desktop (>1024px) | 3-4 column grid with sidebar |

### 6.3 Loading States

- **Skeleton loading** for community cards/lists
- **Optimistic updates** for join/leave actions
- **Progressive loading** for member lists

### 6.4 Error States

- **Empty states** with clear CTAs ("No communities found → Create one!")
- **Error boundaries** with retry options
- **Form validation** with inline feedback

---

## Part 7: Security Considerations

### 7.1 Authorization Matrix

| Action | Guest | Soft Auth | Hive Auth |
|--------|-------|-----------|-----------|
| View public community | Yes | Yes | Yes |
| View private community | No | If member | If member |
| Join public community | No | Yes | Yes |
| Request to join private | No | Yes | Yes |
| Create community | No | Yes | Yes |
| Moderate community | No | If mod/admin | If mod/admin |
| Delete community | No | If creator | If creator |

### 7.2 Rate Limits

| Action | Limit |
|--------|-------|
| Create community | 3 per day |
| Join community | 20 per hour |
| Send invite | 50 per day |
| Create post | 10 per hour |

### 7.3 Content Moderation

- **Profanity filter** for community names
- **Image moderation** for avatars/covers (future)
- **Spam detection** for rapid posting

---

## Part 8: Migration & Deployment Strategy

### 8.1 Phase 1 Deployment

1. Deploy Firestore indexes (async, can take hours)
2. Deploy API routes
3. Deploy UI components behind feature flag
4. Enable for beta users
5. Monitor and iterate
6. Full rollout

### 8.2 Feature Flags

```typescript
const FEATURE_FLAGS = {
  COMMUNITIES_ENABLED: true,
  COMMUNITIES_CREATE_ENABLED: true,
  COMMUNITIES_PRIVATE_ENABLED: true,
  COMMUNITIES_INVITES_ENABLED: false, // Phase 2
  COMMUNITIES_HIVE_SYNC_ENABLED: false, // Phase 4
};
```

### 8.3 Monitoring

- Track community creation rate
- Monitor join/leave funnel
- Measure post engagement per community
- Alert on error rates > 1%

---

## Part 9: Success Metrics

### 9.1 Launch Metrics (Week 1)

- [ ] 50+ communities created
- [ ] 500+ community memberships
- [ ] 100+ community posts
- [ ] <1% error rate

### 9.2 Growth Metrics (Month 1)

- [ ] 200+ active communities (>5 members)
- [ ] 2,000+ total memberships
- [ ] Average 3+ communities per active user
- [ ] 30% of posts are in communities

### 9.3 Engagement Metrics (Quarter 1)

- [ ] 50%+ 7-day retention for community members
- [ ] 20%+ of users are community creators or mods
- [ ] Community posts get 2x engagement vs non-community

---

## Part 10: Implementation Checklist

### Phase 1 Checklist

- [ ] **API Enhancements**
  - [ ] Add `GET /api/communities/[slug]` (by slug)
  - [ ] Add `GET /api/communities/[id]/posts`
  - [ ] Add `POST /api/soft-posts` community support
  - [ ] Add user context to community responses

- [ ] **Components**
  - [ ] CommunityCard
  - [ ] CommunityList
  - [ ] CommunityFilters
  - [ ] CommunityDiscoveryPage
  - [ ] CommunityHeader
  - [ ] CommunityTabs
  - [ ] CommunityPosts
  - [ ] CommunityMembers
  - [ ] CommunityAbout
  - [ ] CommunityDetailPage
  - [ ] CreateCommunityForm
  - [ ] JoinButton

- [ ] **Pages**
  - [ ] `/communities` - Discovery
  - [ ] `/communities/create` - Create
  - [ ] `/communities/[slug]` - Detail

- [ ] **Navigation**
  - [ ] Add Communities to main nav
  - [ ] Add Communities to mobile nav
  - [ ] Add user's communities to sidebar

### Phase 2 Checklist

- [ ] User Communities Dashboard
- [ ] Community Settings Page
- [ ] Member Management Panel
- [ ] Pending Requests UI
- [ ] Role Management Actions

### Phase 3 Checklist

- [ ] Invitation System UI
- [ ] Advanced Search
- [ ] Trending/Recommended
- [ ] Moderation Tools

### Phase 4 Checklist

- [ ] Hive Verification Flow
- [ ] Cross-Platform Sync
- [ ] Blockchain Post Mirror

---

## Appendix A: API Reference

### Communities API

```
GET    /api/communities
       Query: search, sportCategory, type, sort, limit, offset
       Response: { communities: Community[], total: number, hasMore: boolean }

POST   /api/communities
       Body: CreateCommunityInput
       Headers: x-user-id, x-username, x-hive-username (optional)
       Response: Community

GET    /api/communities/[id]
       Response: Community

GET    /api/communities/slug/[slug]
       Response: CommunityWithContext

PATCH  /api/communities/[id]
       Body: UpdateCommunityInput
       Response: Community

DELETE /api/communities/[id]
       Response: { success: boolean }
```

### Members API

```
GET    /api/communities/[id]/members
       Query: status, role, limit
       Response: { members: CommunityMember[], total: number }

POST   /api/communities/[id]/members
       Headers: x-user-id, x-username, x-hive-username (optional)
       Response: CommunityMember

DELETE /api/communities/[id]/members
       Headers: x-user-id
       Response: { success: boolean }

POST   /api/communities/[id]/members/[userId]/approve
       Response: CommunityMember

POST   /api/communities/[id]/members/[userId]/ban
       Response: { success: boolean }

PATCH  /api/communities/[id]/members/[userId]/role
       Body: { role: CommunityMemberRole }
       Response: CommunityMember
```

### Invites API

```
GET    /api/communities/[id]/invites
       Response: { invites: CommunityInvite[] }

POST   /api/communities/[id]/invites
       Body: { email?: string, hiveUsername?: string }
       Response: CommunityInvite

POST   /api/invites/[inviteId]/accept
       Headers: x-user-id, x-username
       Response: CommunityMember

DELETE /api/communities/[id]/invites/[inviteId]
       Response: { success: boolean }
```

---

## Appendix B: Hive Community Operations Reference

For future blockchain integration, here are the Hive custom_json operations:

```typescript
// Subscribe to community
{
  "id": "community",
  "json": ["subscribe", { "community": "hive-115814" }]
}

// Unsubscribe from community
{
  "id": "community",
  "json": ["unsubscribe", { "community": "hive-115814" }]
}

// Set user role (admin only)
{
  "id": "community",
  "json": ["setRole", {
    "community": "hive-115814",
    "account": "username",
    "role": "mod"
  }]
}

// Update community properties (admin only)
{
  "id": "community",
  "json": ["updateProps", {
    "community": "hive-115814",
    "props": {
      "title": "Community Name",
      "about": "Description",
      "is_nsfw": false,
      "description": "Extended rules...",
      "flag_text": "Report guidelines"
    }
  }]
}
```

---

*This plan was crafted with the understanding that technology alone is not enough. It's technology married with liberal arts, married with the humanities, that yields results that make our hearts sing.*
