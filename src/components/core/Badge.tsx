import React from 'react';
import { cn } from '@/lib/utils/client';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'live'
    | 'win'
    | 'loss'
    | 'pending'
    | 'medals';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'border-transparent bg-sb-teal/12 text-sb-teal',
  secondary: 'border-transparent bg-sb-turf text-sb-text-body',
  destructive: 'border-transparent bg-sb-loss-bg text-sb-loss',
  outline: 'text-sb-text-body border-sb-border',
  live: 'bg-sb-teal/12 text-sb-teal border-sb-teal/25',
  win: 'bg-sb-win-bg text-sb-win border-sb-win/30',
  loss: 'bg-sb-loss-bg text-sb-loss border-sb-loss/30',
  pending: 'bg-sb-pending-bg text-sb-pending border-sb-pending/30',
  medals: 'bg-sb-gold/12 text-sb-gold border-sb-gold/25 font-mono',
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
