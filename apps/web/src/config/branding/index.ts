/**
 * White-label brand registry.
 *
 * Selection happens at BUILD time via `NEXT_PUBLIC_BRAND`. The env
 * var is inlined into the bundle by Next.js, so the resulting bundle
 * ships ONE brand — there is no runtime brand-switcher. This keeps
 * the per-brand bundle small and avoids a flash-of-wrong-brand on
 * first paint.
 *
 *   NEXT_PUBLIC_BRAND=ezgate   pnpm --filter web build   # default
 *   NEXT_PUBLIC_BRAND=ezegate  pnpm --filter web build
 *
 * Unrecognised values fall back to the default brand with a
 * console.warn (so a typo in deploy config doesn't break the build,
 * but does surface in CI logs).
 */
import type { Brand } from './types';
import { ezgateBrand } from './ezgate';
import { ezegateBrand } from './ezegate';

const BRANDS: Record<string, Brand> = {
  ezgate: ezgateBrand,
  ezegate: ezegateBrand,
};

const DEFAULT_BRAND_ID = 'ezgate';

function resolveBrand(): Brand {
  const requested = process.env.NEXT_PUBLIC_BRAND?.trim().toLowerCase();
  if (!requested || requested === DEFAULT_BRAND_ID) {
    return BRANDS[DEFAULT_BRAND_ID];
  }
  const match = BRANDS[requested];
  if (match) {
    return match;
  }
  // Fall back loudly — typos in deploy config shouldn't kill the
  // build, but they should be obvious in CI logs.
  // eslint-disable-next-line no-console
  console.warn(
    `[branding] Unknown NEXT_PUBLIC_BRAND="${requested}"; falling back to "${DEFAULT_BRAND_ID}". Known brands: ${Object.keys(BRANDS).join(', ')}.`,
  );
  return BRANDS[DEFAULT_BRAND_ID];
}

/**
 * The active brand for this build. Import as `BRAND` and read fields
 * directly — `BRAND.appName`, `BRAND.colors.light.primary`, etc.
 *
 * Import path is intentionally short so refactor-rename calls are
 * easy to spot in PR diffs.
 */
export const BRAND: Brand = resolveBrand();

export type { Brand, BrandColors, BrandColorPalette } from './types';
