import { cn } from '@/lib/utils/client';

type LogoProps = {
  variant?: 'horizontal' | 'stacked' | 'mark';
  size?: number;
  className?: string;
};

export function Logo({ variant = 'horizontal', size = 40, className }: LogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SportsBlock"
        className={cn(className)}
      >
        <polygon points="110,82 60,110 10,82 10,38 60,10 110,38" fill="#00C49A" />
        <path
          d="M34,88 L60,48 L86,88"
          fill="none"
          stroke="#051A14"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="100" r="7" fill="#051A14" />
      </svg>
    );
  }

  if (variant === 'horizontal') {
    return (
      <svg
        viewBox="0 0 480 120"
        height={size}
        width={size * 4}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SportsBlock"
        className={cn(className)}
      >
        <polygon points="110,82 60,110 10,82 10,38 60,10 110,38" fill="#00C49A" />
        <path
          d="M34,88 L60,48 L86,88"
          fill="none"
          stroke="#051A14"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="100" r="7" fill="#051A14" />
        <text
          x="132"
          y="78"
          fontFamily="var(--font-display), 'Arial Narrow', sans-serif"
          fontWeight="700"
          fontSize="68"
          letterSpacing="-1"
          fill="#F0F0F0"
        >
          SPORTS
        </text>
        <text
          x="322"
          y="78"
          fontFamily="var(--font-display), 'Arial Narrow', sans-serif"
          fontWeight="700"
          fontSize="68"
          letterSpacing="-1"
          fill="#00C49A"
        >
          BLOCK
        </text>
      </svg>
    );
  }

  // stacked
  return (
    <svg
      viewBox="0 0 240 200"
      width={size * 2}
      height={size * (200 / 120)}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SportsBlock"
      className={cn(className)}
    >
      <g transform="translate(60, 0)">
        <polygon points="110,82 60,110 10,82 10,38 60,10 110,38" fill="#00C49A" />
        <path
          d="M34,88 L60,48 L86,88"
          fill="none"
          stroke="#051A14"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="100" r="7" fill="#051A14" />
      </g>
      <text
        x="120"
        y="160"
        textAnchor="middle"
        fontFamily="var(--font-display), 'Arial Narrow', sans-serif"
        fontWeight="700"
        fontSize="52"
        letterSpacing="-0.5"
        fill="#F0F0F0"
      >
        SPORTS
      </text>
      <text
        x="120"
        y="194"
        textAnchor="middle"
        fontFamily="var(--font-display), 'Arial Narrow', sans-serif"
        fontWeight="700"
        fontSize="32"
        letterSpacing="3"
        fill="#00C49A"
      >
        BLOCK
      </text>
    </svg>
  );
}
