import type { BrandColorPalette } from './types';
import { BRAND } from './index';

/**
 * Renders a `<style>` tag that overrides the base CSS variables
 * declared in `globals.css` `@theme` block with the active brand's
 * palette. Mounts once in the root layout's `<head>`.
 *
 * Why a `<style>` tag instead of editing `globals.css` directly?
 * `globals.css` is consumed by Tailwind v4's PostCSS pipeline at
 * build time — its values are baked. A small `<style>` injection
 * gives us per-brand overrides without forking the stylesheet,
 * keeps the diff small, and avoids any runtime CSS-in-JS overhead
 * (one tag, evaluated once at hydration).
 *
 * The CSS string is built from a checked-in TS module — there is
 * no untrusted input — and rendered as plain `<style>` children
 * (no `dangerouslySetInnerHTML`).
 */
function paletteToCss(palette: BrandColorPalette): string {
  return [
    `--color-primary: ${palette.primary};`,
    `--color-primary-foreground: ${palette.primaryForeground};`,
    `--color-secondary: ${palette.secondary};`,
    `--color-secondary-foreground: ${palette.secondaryForeground};`,
    `--color-destructive: ${palette.destructive};`,
    `--color-destructive-foreground: ${palette.destructiveForeground};`,
    `--color-muted: ${palette.muted};`,
    `--color-muted-foreground: ${palette.mutedForeground};`,
    `--color-accent: ${palette.accent};`,
    `--color-accent-foreground: ${palette.accentForeground};`,
    `--color-card: ${palette.card};`,
    `--color-card-foreground: ${palette.cardForeground};`,
    `--color-border: ${palette.border};`,
    `--color-input: ${palette.input};`,
    `--color-ring: ${palette.ring};`,
    `--color-background: ${palette.background};`,
    `--color-foreground: ${palette.foreground};`,
    `--color-sidebar: ${palette.sidebar};`,
    `--color-sidebar-foreground: ${palette.sidebarForeground};`,
    `--color-success: ${palette.success};`,
    `--color-warning: ${palette.warning};`,
    `--color-logo-accent: ${palette.logoAccent};`,
  ].join('\n  ');
}

/**
 * Server-rendered `<style>` tag that re-declares the brand palette
 * CSS variables. Place inside `<head>` of the root layout AFTER the
 * imported `globals.css` so brand values win the cascade.
 *
 * Using `dangerouslySetInnerHTML` here is intentional and SAFE:
 * the CSS is built entirely from values in checked-in TypeScript
 * modules (`branding/<brand>.ts`) — no user input, no DB read, no
 * environment variable concatenated as raw text. The alternative
 * (`<style>{cssString}</style>` with text children) gets serialised
 * into the React Server Components stream rather than rendered as
 * a literal tag in `<head>`, which causes a brief flash of the
 * default theme on first paint.
 */
export function BrandStyles(): React.ReactElement {
  const css = `:root {\n  ${paletteToCss(BRAND.colors.light)}\n}\n.dark {\n  ${paletteToCss(BRAND.colors.dark)}\n}`;
  return (
    <style
      data-brand={BRAND.id}
      // eslint-disable-next-line react/no-danger -- see comment above; CSS source is checked-in TS
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}
