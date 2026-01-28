import * as React from 'react';
import { cn } from '@/lib/utils/client';
import { getAvatarUrl } from '@/lib/utils/avatar';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-6 w-6 text-xs',
      md: 'h-8 w-8 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    };

    // Track which fallback stage we're at: 0 = src, 1 = hive avatar, 2 = dicebear
    const [fallbackStage, setFallbackStage] = React.useState(0);

    // Reset fallback stage when src changes
    React.useEffect(() => {
      setFallbackStage(0);
    }, [src]);

    // Hive avatar URL derived from the fallback (username)
    const hiveAvatarUrl = fallback ? `https://images.hive.blog/u/${fallback}/avatar` : null;

    const handleImageError = () => {
      setFallbackStage((prev) => prev + 1);
    };

    // Determine the image URL with cascade: src → hive avatar → dicebear
    const imageUrl = React.useMemo(() => {
      // Stage 0: use the provided src
      if (fallbackStage === 0 && src) {
        return src;
      }
      // Stage 1: if src failed, try the Hive avatar service as intermediate fallback
      // (only when we had a src that broke, and it wasn't already the hive URL)
      if (fallbackStage === 1 && src && hiveAvatarUrl && src !== hiveAvatarUrl) {
        return hiveAvatarUrl;
      }
      // Final fallback: generate a DiceBear avatar
      if (fallback) {
        return getAvatarUrl(null, fallback);
      }
      return null;
    }, [src, fallbackStage, fallback, hiveAvatarUrl]);

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={alt || 'Avatar'}
            className="h-full w-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
            {fallback ? (
              fallback.charAt(0).toUpperCase()
            ) : (
              <span className="text-muted-foreground">?</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
