// Temporarily comment out NextConfig type import to fix module resolution
// import type { NextConfig } from "next";

const nextConfig = {
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  // Bundle optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
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
        hostname: 'files.dtube.tv',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['@hiveio/dhive', '@hiveio/workerbee', '@hiveio/wax'],
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config: unknown, { isServer, dev }: { isServer: boolean; dev: boolean }) => {
    const webpackConfig = config as { 
      resolve: { fallback: Record<string, unknown> };
      optimization: { splitChunks: any };
    };
    
    if (!isServer) {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Bundle optimization
    if (!dev && !isServer) {
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
          hive: {
            test: /[\\/]node_modules[\\/](@hiveio|@aioha)[\\/]/,
            name: 'hive-libs',
            chunks: 'all',
            priority: 15,
          },
          ui: {
            test: /[\\/]node_modules[\\/](lucide-react|@radix-ui)[\\/]/,
            name: 'ui-libs',
            chunks: 'all',
            priority: 12,
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
