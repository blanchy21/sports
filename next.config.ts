// Temporarily comment out NextConfig type import to fix module resolution
// import type { NextConfig } from "next";

const nextConfig = {
  images: {
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
  // Only use webpack config when not using Turbopack
  ...(process.env.TURBOPACK !== '1' && {
    webpack: (config: any, { isServer }: { isServer: boolean }) => {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
        };
      }
      return config;
    },
  }),
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    },
  },
};

export default nextConfig;
