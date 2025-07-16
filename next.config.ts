import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Production output configuration
  output: 'standalone',
  
  // Allow external network access in development
  allowedDevOrigins: [
    'http://192.168.4.186:3000',
    'http://192.168.4.*:3000',
    'http://192.168.*.*:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', '@tanstack/react-table', 'lucide-react'],
  },

  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      underscore: 'lodash',
    },
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ['dictionary.mafendeblaise.info', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dictionary.mafendeblaise.info',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.dhis2.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-Access-Log',
            value: 'enabled'
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=300, stale-while-revalidate=600'
          },
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Reduce bundle size by removing development-only code
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      };
    }

    // Optimize for better tree shaking
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };

    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
