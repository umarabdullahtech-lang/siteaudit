/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@shared/types'],
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
