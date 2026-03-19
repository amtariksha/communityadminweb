/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@communityos/shared'],
  typescript: {
    // Type-check is done locally and in CI; skip during Vercel build
    ignoreBuildErrors: true,
  },
};
module.exports = nextConfig;
