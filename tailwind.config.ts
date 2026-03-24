import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        // SportsBlock brand palette (dark-only, teal=action, gold=reward)
        'sb-void': '#0D0D0D',
        'sb-pitch': '#111518',
        'sb-stadium': '#161B1E',
        'sb-turf': '#1E2A2F',
        'sb-floodlight': '#243038',

        'sb-teal': '#00C49A',
        'sb-teal-deep': '#00A882',
        'sb-teal-flash': '#00E5B4',
        'sb-teal-shadow': '#0A3D30',

        'sb-gold': '#E8A020',
        'sb-gold-shine': '#F5C355',
        'sb-gold-deep': '#C07A10',
        'sb-gold-shadow': '#3D2800',

        'sb-text-primary': '#F0F0F0',
        'sb-text-body': '#C8CDD0',
        'sb-text-muted': '#888E94',

        'sb-border': '#3A4248',
        'sb-border-subtle': '#2A3238',

        'sb-win': '#00C49A',
        'sb-win-bg': '#0A3D30',
        'sb-loss': '#E84040',
        'sb-loss-bg': '#3D0A0A',
        'sb-pending': '#E8A020',
        'sb-pending-bg': '#3D2800',

        // Legacy aliases (remap old palette → new brand tokens)
        'bright-cobalt': '#00C49A',
        'fibonacci-blue': '#111518',
        'aegean-sky': '#E8A020',
        'landing-green': '#00C49A',
        'landing-blue': '#00A882',

        // Semantic theme colors (CSS-var-backed)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Arial Narrow', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['72px', { lineHeight: '0.9', letterSpacing: '-0.01em', fontWeight: '700' }],
        'display-l': ['48px', { lineHeight: '0.95', letterSpacing: '-0.01em', fontWeight: '700' }],
        'display-m': ['36px', { lineHeight: '1.0', letterSpacing: '-0.01em', fontWeight: '700' }],
        'display-s': ['24px', { lineHeight: '1.1', letterSpacing: '0', fontWeight: '600' }],
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        enter: 'cubic-bezier(0, 0, 0.2, 1)',
      },
      transitionDuration: {
        '80': '80ms',
        '350': '350ms',
        '500': '500ms',
        '800': '800ms',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'fade-in': 'fadeIn 350ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in': 'slideIn 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-top': 'slideInTop 350ms cubic-bezier(0, 0, 0.2, 1)',
        'bounce-in': 'bounceIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        glow: 'glow 2s ease-in-out infinite alternate', // intentionally 2s — decorative ambient only
        'border-pulse': 'borderPulse 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'marquee-left': 'marquee-left 40s linear infinite',
        'marquee-right': 'marquee-right 40s linear infinite',
        'sb-pulse': 'sb-live-pulse 1400ms ease-in-out infinite',
        'sb-shimmer': 'sb-shimmer 1400ms ease-in-out infinite',
        'sb-spin': 'sb-spin 800ms linear infinite',
        'sb-blockchain-spin': 'sb-blockchain-spin 800ms cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInTop: {
          '0%': { transform: 'translateY(-20px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(var(--primary), 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(var(--primary), 0.4)' },
        },
        borderPulse: {
          /* sb-gold (#E8A020) = brand gold accent */
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(232, 160, 32, 0.3), inset 0 0 0 0 rgba(232, 160, 32, 0.05)',
          },
          '50%': {
            boxShadow:
              '0 0 15px 2px rgba(232, 160, 32, 0.4), inset 0 0 10px 0 rgba(232, 160, 32, 0.1)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'marquee-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-right': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'sb-live-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.85)' },
        },
        'sb-shimmer': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'sb-spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'sb-blockchain-spin': {
          '0%': { transform: 'rotate(0deg)', opacity: '0.7' },
          '50%': { opacity: '1' },
          '100%': { transform: 'rotate(360deg)', opacity: '0.7' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate, typography],
};

export default config;
