import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Security headers including CSP
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Default policy - restrict to self
              "default-src 'self'",
              // Scripts - self, inline for Next.js hydration, and eval for dev
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              // Styles - self and inline (required for styled-jsx and Tailwind)
              "style-src 'self' 'unsafe-inline'",
              // Images - self, data URIs, and allowed image hosts
              "img-src 'self' data: blob: https://images.unsplash.com https://cdn.steemitimages.com https://steemitimages.com https://images.hive.blog https://gateway.ipfs.io https://ipfs.io https://files.peakd.com https://files.ecency.com https://files.3speak.tv https://files.dtube.tv",
              // Fonts - self and data URIs
              "font-src 'self' data:",
              // Connect - API endpoints, Hive nodes, and Sentry
              "connect-src 'self' https://api.hive.blog https://api.deathwing.me https://api.openhive.network https://anyx.io https://rpc.ausbit.dev https://api.coingecko.com https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://*.sentry.io https://*.ingest.sentry.io",
              // Frames - restricted to video embeds
              "frame-src 'self' https://www.youtube.com https://youtube.com https://player.vimeo.com https://3speak.tv https://emb.3speak.tv",
              // Object - none
              "object-src 'none'",
              // Base URI - self only
              "base-uri 'self'",
              // Form actions - self only
              "form-action 'self'",
              // Frame ancestors - prevent clickjacking
              "frame-ancestors 'self'",
              // Upgrade insecure requests in production
              process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests' : '',
            ].filter(Boolean).join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
  // Webpack configuration for WASM support (required for @hiveio/wax)
  webpack: (config, { isServer, webpack }) => {
    // Suppress OpenTelemetry/Sentry critical dependency warnings
    // These are caused by dynamic requires in @opentelemetry/instrumentation
    // and don't affect functionality - just noisy console output
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency/,
      },
      {
        module: /@sentry/,
        message: /Critical dependency/,
      },
    ];

    // Also use ContextReplacementPlugin to suppress the warning at build time
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /@opentelemetry\/instrumentation/,
        (data: { dependencies: Array<{ critical?: boolean }> }) => {
          // Remove critical flag from dynamic requires
          data.dependencies.forEach((dependency) => {
            if (dependency.critical) {
              dependency.critical = false;
            }
          });
          return data;
        }
      )
    );

    // Externalize WorkerBee and Wax packages - they should only be used server-side
    // This prevents WASM files from being bundled on the client
    if (!isServer) {
      // On client side, completely ignore WorkerBee and Wax packages
      config.resolve.alias = {
        ...config.resolve.alias,
        '@hiveio/workerbee': false,
        '@hiveio/wax': false,
      };
      
      // Ignore WASM files on client side
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/wasm/[name][ext]',
        },
      });
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    } else {
      // On server side, enable WebAssembly support
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
      
      // Handle WASM files properly on server
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });
      
      // Externalize WorkerBee and Wax packages on server
      config.externals = config.externals || [];
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [
          originalExternals,
          ({ request }: { request?: string }, callback: (err: null | Error, result?: string) => void) => {
            if (request?.includes('@hiveio/workerbee') || request?.includes('@hiveio/wax')) {
              return callback(null, `commonjs ${request}`);
            }
            callback(null);
          },
        ];
      } else if (Array.isArray(config.externals)) {
        config.externals.push('@hiveio/workerbee', '@hiveio/wax');
      }
    }
    
    return config;
  },
  experimental: {
    optimizeCss: true,
    // Tree-shake imports from large packages to reduce bundle size
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      'framer-motion',
      'date-fns',
      'react-markdown',
      'zod',
    ],
  },
  // Bundle optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    // Allow local static images and API proxy images with query strings
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.steemitimages.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'steemitimages.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.hive.blog',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'files.peakd.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'files.ecency.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'files.3speak.tv',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'files.peakd.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'files.dtube.tv',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['@hiveio/workerbee', '@hiveio/wax'],
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Organization and project from environment variables
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps (only in CI/CD)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production builds
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable Sentry during development builds
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',

  // Hide source maps from being publicly accessible
  hideSourceMaps: true,

  // Automatically instrument routes
  automaticVercelMonitors: true,
};

// Wrap with Sentry only if DSN is configured
const exportedConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default exportedConfig;
