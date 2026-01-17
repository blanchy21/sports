'use client';

/**
 * AdWrapper Component
 *
 * Wraps ad content and only renders it for non-premium users.
 * Premium users (Bronze tier and above) enjoy an ad-free experience.
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShouldShowAds } from '@/lib/premium/hooks';

interface AdWrapperProps {
  /** The ad content to potentially display */
  children: React.ReactNode;
  /** Optional placeholder shown while loading premium status */
  loadingPlaceholder?: React.ReactNode;
  /** Optional fallback content for premium users (e.g., "Thanks for being premium!") */
  premiumFallback?: React.ReactNode;
  /** Optional CSS class */
  className?: string;
}

/**
 * Wraps ad content and hides it for premium users
 *
 * @example
 * ```tsx
 * <AdWrapper>
 *   <AdBanner slot="sidebar-top" />
 * </AdWrapper>
 * ```
 */
export function AdWrapper({
  children,
  loadingPlaceholder,
  premiumFallback,
  className,
}: AdWrapperProps) {
  const { user } = useAuth();
  const { showAds, isLoading } = useShouldShowAds(user?.username);

  // While loading, show placeholder or nothing
  if (isLoading) {
    return loadingPlaceholder ? (
      <div className={className}>{loadingPlaceholder}</div>
    ) : null;
  }

  // If user shouldn't see ads (premium), show fallback or nothing
  if (!showAds) {
    return premiumFallback ? (
      <div className={className}>{premiumFallback}</div>
    ) : null;
  }

  // Show ads for non-premium users
  return <div className={className}>{children}</div>;
}

/**
 * Higher-order component version for wrapping ad components
 *
 * @example
 * ```tsx
 * const PremiumAwareBanner = withAdWrapper(AdBanner);
 * ```
 */
export function withAdWrapper<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  wrapperProps?: Omit<AdWrapperProps, 'children'>
) {
  const WithAdWrapperComponent = (props: P) => (
    <AdWrapper {...wrapperProps}>
      <WrappedComponent {...props} />
    </AdWrapper>
  );

  WithAdWrapperComponent.displayName = `WithAdWrapper(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithAdWrapperComponent;
}
