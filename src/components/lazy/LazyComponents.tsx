import dynamic from 'next/dynamic';
import { ErrorBoundary, CompactErrorFallback } from '@/components/ErrorBoundary';

/**
 * Loading spinner component for lazy-loaded content
 */
function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * Wrapper that adds error boundary to lazy components
 */
function withLazyErrorBoundary<P extends object>(
  LazyComponent: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={<CompactErrorFallback message={`Failed to load ${componentName}`} />}>
      <LazyComponent {...props} />
    </ErrorBoundary>
  );
  WrappedComponent.displayName = `LazyWithBoundary(${componentName})`;
  return WrappedComponent;
}

// Lazy load heavy components with error boundaries
const LazyAuthModalBase = dynamic(
  () => import('@/components/AuthModal').then(mod => ({ default: mod.AuthModal })),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading authentication..." />,
  }
);
export const LazyAuthModal = withLazyErrorBoundary(LazyAuthModalBase, 'AuthModal');

const LazyVotingDemoBase = dynamic(
  () => import('@/components/VotingDemo').then(mod => ({ default: mod.VotingDemo })),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading voting demo..." />,
  }
);
export const LazyVotingDemo = withLazyErrorBoundary(LazyVotingDemoBase, 'VotingDemo');

const LazyRealtimeFeedBase = dynamic(
  () => import('@/components/RealtimeFeed').then(mod => ({ default: mod.RealtimeFeed })),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading feed..." />,
  }
);
export const LazyRealtimeFeed = withLazyErrorBoundary(LazyRealtimeFeedBase, 'RealtimeFeed');

// Lazy load modals with error boundaries
const LazyCommentsModalBase = dynamic(
  () => import('@/components/modals/CommentsModal').then(mod => ({ default: mod.CommentsModal })),
  { ssr: false }
);
export const LazyCommentsModal = withLazyErrorBoundary(LazyCommentsModalBase, 'CommentsModal');

const LazyUpvoteListModalBase = dynamic(
  () => import('@/components/modals/UpvoteListModal').then(mod => ({ default: mod.UpvoteListModal })),
  { ssr: false }
);
export const LazyUpvoteListModal = withLazyErrorBoundary(LazyUpvoteListModalBase, 'UpvoteListModal');

const LazyUserProfileModalBase = dynamic(
  () => import('@/components/modals/UserProfileModal').then(mod => ({ default: mod.UserProfileModal })),
  { ssr: false }
);
export const LazyUserProfileModal = withLazyErrorBoundary(LazyUserProfileModalBase, 'UserProfileModal');

const LazyDescriptionModalBase = dynamic(
  () => import('@/components/modals/DescriptionModal').then(mod => ({ default: mod.DescriptionModal })),
  { ssr: false }
);
export const LazyDescriptionModal = withLazyErrorBoundary(LazyDescriptionModalBase, 'DescriptionModal');

// Lazy load community components with error boundaries
const LazyCommunityDetailBase = dynamic(
  () => import('@/components/community/CommunityDetail').then(mod => ({ default: mod.CommunityDetail })),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading community..." />,
  }
);
export const LazyCommunityDetail = withLazyErrorBoundary(LazyCommunityDetailBase, 'CommunityDetail');

const LazyCommunitiesListBase = dynamic(
  () => import('@/components/community/CommunitiesList').then(mod => ({ default: mod.CommunitiesList })),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading communities..." />,
  }
);
export const LazyCommunitiesList = withLazyErrorBoundary(LazyCommunitiesListBase, 'CommunitiesList');

// Lazy load SportsFilterPopup (uses framer-motion, only shown when opened)
const LazySportsFilterPopupBase = dynamic(
  () => import('@/components/SportsFilterPopup').then(mod => ({ default: mod.SportsFilterPopup })),
  { ssr: false }
);
export const LazySportsFilterPopup = withLazyErrorBoundary(LazySportsFilterPopupBase, 'SportsFilterPopup');

// Lazy load UpgradeFlow (uses Aioha wallet library, only shown when upgrading)
const LazyUpgradeFlowBase = dynamic(
  () => import('@/components/UpgradeFlow').then(mod => ({ default: mod.UpgradeFlow })),
  { ssr: false }
);
export const LazyUpgradeFlow = withLazyErrorBoundary(LazyUpgradeFlowBase, 'UpgradeFlow');

// Lazy load NotificationDropdown (uses date-fns, only shown when notifications opened)
const LazyNotificationDropdownBase = dynamic(
  () => import('@/components/NotificationDropdown').then(mod => ({ default: mod.NotificationDropdown })),
  { ssr: false }
);
export const LazyNotificationDropdown = withLazyErrorBoundary(LazyNotificationDropdownBase, 'NotificationDropdown');
