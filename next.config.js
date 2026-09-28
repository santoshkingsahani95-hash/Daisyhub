/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/ace_garment',
      },
      {
        source: '/admin/:path*',
        destination: '/ace_garment/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
