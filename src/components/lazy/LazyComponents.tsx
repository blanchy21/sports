import dynamic from 'next/dynamic';

// Lazy load heavy components
export const LazyAuthModal = dynamic(
  () => import('@/components/AuthModal').then(mod => ({ default: mod.AuthModal })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-4">Loading...</div>
  }
);

export const LazyVotingDemo = dynamic(
  () => import('@/components/VotingDemo').then(mod => ({ default: mod.VotingDemo })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-4">Loading voting demo...</div>
  }
);

export const LazyRealtimeFeed = dynamic(
  () => import('@/components/RealtimeFeed').then(mod => ({ default: mod.RealtimeFeed })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-4">Loading feed...</div>
  }
);

// Lazy load modals
export const LazyCommentsModal = dynamic(
  () => import('@/components/modals/CommentsModal').then(mod => ({ default: mod.CommentsModal })),
  { ssr: false }
);

export const LazyUpvoteListModal = dynamic(
  () => import('@/components/modals/UpvoteListModal').then(mod => ({ default: mod.UpvoteListModal })),
  { ssr: false }
);

export const LazyUserProfileModal = dynamic(
  () => import('@/components/modals/UserProfileModal').then(mod => ({ default: mod.UserProfileModal })),
  { ssr: false }
);

export const LazyDescriptionModal = dynamic(
  () => import('@/components/modals/DescriptionModal').then(mod => ({ default: mod.DescriptionModal })),
  { ssr: false }
);

// Lazy load community components
export const LazyCommunityDetail = dynamic(
  () => import('@/components/community/CommunityDetail').then(mod => ({ default: mod.CommunityDetail })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-4">Loading community...</div>
  }
);

export const LazyCommunitiesList = dynamic(
  () => import('@/components/community/CommunitiesList').then(mod => ({ default: mod.CommunitiesList })),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-4">Loading communities...</div>
  }
);
