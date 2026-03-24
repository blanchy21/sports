import { cn } from '@/lib/utils';

interface BlockchainSpinnerProps {
  /** 'sm' = 16px, 'md' = 24px, 'lg' = 32px */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label describing the current operation */
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
} as const;

/**
 * Branded blockchain spinner — hexagonal mark with rotating/pulsing animation.
 * ONLY use during blockchain writes (Hive broadcasts, Hive Engine token transfers).
 */
export function BlockchainSpinner({
  size = 'md',
  label = 'Broadcasting to blockchain...',
  className,
}: BlockchainSpinnerProps) {
  const px = sizeMap[size];

  return (
    <div
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-sb-blockchain-spin"
      >
        {/* Hexagon path matching the SportsBlock logo mark */}
        <path d="M16 2L28.66 9.5V24.5L16 32L3.34 24.5V9.5L16 2Z" fill="#00C49A" />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
