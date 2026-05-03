/**
 * White-label branding contract.
 *
 * Each deployment ships ONE brand at build time. The brand is picked
 * by setting `NEXT_PUBLIC_BRAND=ezgate` (default) or
 * `NEXT_PUBLIC_BRAND=ezegate` before `pnpm build` / `vercel build`.
 *
 * To add a new brand:
 *   1. Create `branding/<slug>.ts` exporting a `Brand` object.
 *   2. Register it in `branding/index.ts` via the `BRANDS` map.
 *   3. Set `NEXT_PUBLIC_BRAND=<slug>` in the deploy environment.
 *
 * The Brand object is the SINGLE SOURCE OF TRUTH for everything the
 * UI displays (name, tagline, copyright owner, logo accent) AND
 * every color token the design system consumes. Hard-coded brand
 * strings or hex codes anywhere else are a regression — keep them
 * here.
 */

/**
 * Full color palette per brand. Every token corresponds to a CSS
 * variable in `apps/web/src/styles/globals.css` (e.g. `primary` →
 * `--color-primary`). The values are written into a `<style>` tag
 * by the root layout so Tailwind utility classes (`bg-primary`,
 * `text-foreground`, etc.) resolve to the brand-specific value.
 *
 * Light + dark must both be present. If you don't have a real dark
 * palette, mirror the light values — the design degrades gracefully.
 */
export interface BrandColorPalette {
  /** Primary CTA / brand accent — the most-visible color in the app. */
  primary: string;
  /** Foreground (text) over primary — usually white or near-black. */
  primaryForeground: string;

  /** Secondary surfaces (chip backgrounds, subtle dividers). */
  secondary: string;
  secondaryForeground: string;

  /** Destructive actions (delete, cancel). */
  destructive: string;
  destructiveForeground: string;

  /** Muted UI (placeholder text, disabled controls). */
  muted: string;
  mutedForeground: string;

  /** Accent — used by some shadcn primitives for hover states. */
  accent: string;
  accentForeground: string;

  /** Card / dialog surface. */
  card: string;
  cardForeground: string;

  /** Borders + form inputs. */
  border: string;
  input: string;

  /** Focus ring color. */
  ring: string;

  /** Page background + body text. */
  background: string;
  foreground: string;

  /** Sidebar surface (admin web only — kept for parity). */
  sidebar: string;
  sidebarForeground: string;

  /** Status colors. */
  success: string;
  warning: string;

  /**
   * Logo accent — used by the small "letter" logo tile rendered on
   * the auth layout, sidebar, and legal pages. Distinct from
   * `primary` because the logo can use a contrasting hue (Ezgate's
   * blue primary + orange logo, for example).
   */
  logoAccent: string;
}

export interface BrandColors {
  light: BrandColorPalette;
  dark: BrandColorPalette;
}

export interface Brand {
  /**
   * URL-safe identifier. Set on the `<html data-brand="...">`
   * attribute so brand-specific CSS overrides (if any) can target
   * it. Also surfaces in build logs.
   */
  id: string;

  /**
   * Display name shown in the auth layout, sidebar header, page
   * `<title>`, footer copyright. The single most important brand
   * string in the app.
   */
  appName: string;

  /**
   * Short tagline / sub-heading for the auth layout. Keep under
   * 50 chars.
   */
  tagline: string;

  /**
   * Single character / glyph rendered inside the small logo tile
   * (`bg-logo-accent` rounded square). Usually the first letter of
   * `appName` in lowercase.
   */
  logoLetter: string;

  /**
   * Used in:
   *  - Footer "© {year} {legalEntity}"
   *  - Legal pages copyright line
   *  - PWA / metadata description
   *
   * Keep distinct from `appName` so the entity name (e.g.
   * "Amtariksha Tech Pvt Ltd") can differ from the product name.
   */
  legalEntity: string;

  /** Wrong-app screen needs to know what the OTHER apps are called. */
  appLabels: {
    admin: string;
    resident: string;
    guard: string;
  };

  /** Brand colors — light + dark palettes. */
  colors: BrandColors;
}
