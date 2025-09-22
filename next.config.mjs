/** @type {import('next').NextConfig} */

import withPWA from 'next-pwa';

const nextConfig = {
  // PWA Configuration
  ...withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'gstatic-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|png|svg|gif|webp)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
    ],
  }),

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Enable experimental features
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Allow cross-origin requests from local network IPs
  allowedDevOrigins: ['192.168.1.2', '192.168.2.1'],
};

export default nextConfig;
