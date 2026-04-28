/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@communityos/shared'],
  // `typescript.ignoreBuildErrors: true` used to live here with the
  // comment "type-check is done in CI." Reality check: there was no
  // CI for this repo, so type drift slipped in unnoticed and was only
  // caught when someone ran `pnpm web exec tsc --noEmit` by hand. The
  // GitHub Actions workflow at `.github/workflows/typecheck.yml` now
  // gates merges to main on a clean tsc run, and the Vercel preview
  // build catches anything that gets past it. Keeping the escape hatch
  // out means a regression can't deploy silently.
};
module.exports = nextConfig;
