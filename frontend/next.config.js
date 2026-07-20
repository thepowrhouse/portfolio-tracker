/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://backend:8000/:path*', // Proxy to Python backend
      },
    ];
  },
  output: 'standalone',
};

module.exports = nextConfig;