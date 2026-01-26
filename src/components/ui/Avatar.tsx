import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/lib/utils/avatar";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-6 w-6 text-xs",
      md: "h-8 w-8 text-sm",
      lg: "h-12 w-12 text-base",
      xl: "h-16 w-16 text-lg",
    };

    const [imageError, setImageError] = React.useState(false);

    // Reset error state when src changes
    React.useEffect(() => {
      setImageError(false);
    }, [src]);

    const handleImageError = () => {
      setImageError(true);
    };

    // Determine the image URL to use
    // If we have a src and no error, use it
    // Otherwise, generate a DiceBear avatar from the fallback (username)
    const imageUrl = React.useMemo(() => {
      if (src && !imageError) {
        return src;
      }
      // Use fallback (username) to generate a DiceBear avatar
      if (fallback) {
        return getAvatarUrl(null, fallback);
      }
      return null;
    }, [src, imageError, fallback]);

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full bg-muted",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={alt || "Avatar"}
            fill
            sizes="(max-width: 768px) 24px, (max-width: 1200px) 32px, 48px"
            className="object-cover"
            onError={handleImageError}
            unoptimized={imageUrl.includes('dicebear.com')}
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
Avatar.displayName = "Avatar";

export { Avatar };
