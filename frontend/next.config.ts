import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // In production on Vercel or local, proxy /api to the FastAPI backend (Fly.io or local dev)
    const backendUrl =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://parkliplan-api.fly.dev'
        : 'http://127.0.0.1:8000');

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
