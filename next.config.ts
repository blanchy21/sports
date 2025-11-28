import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack configuration for WASM support (required for @hiveio/wax)
  webpack: (config, { isServer }) => {
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

export default nextConfig;
