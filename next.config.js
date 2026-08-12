/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    // The API is called same-origin only, so we don't advertise CORS — this
    // stops other websites from driving our (paid) AI/import endpoints from a
    // visitor's browser. Add an explicit allow-list here if that ever changes.
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
