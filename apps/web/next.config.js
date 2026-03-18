/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@communityos/shared'],
  typescript: {
    // Type-check is done locally and in CI; skip during Vercel build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Linting is done locally and in CI; skip during Vercel build
    ignoreDuringBuilds: true,
  },
};
module.exports = nextConfig;
