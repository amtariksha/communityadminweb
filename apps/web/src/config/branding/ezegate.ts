import type { Brand } from './types';

/**
 * Ezegate — ALTERNATE brand. Build with `NEXT_PUBLIC_BRAND=ezegate
 * pnpm build` (or set the env var in the deploy environment).
 *
 * Color values below are PLACEHOLDERS — pick a green/teal accent so
 * the brand is visibly distinct from Ezgate (default blue/orange).
 * Edit freely; nothing else in the codebase needs to change.
 *
 * If Ezegate keeps the same colors as Ezgate but only the brand
 * strings change, copy the `colors` block from `ezgate.ts` here.
 */
export const ezegateBrand: Brand = {
  id: 'ezegate',
  appName: 'Ezegate',
  tagline: 'Society Management Platform',
  logoLetter: 'e',
  legalEntity: 'Ezegate',
  appLabels: {
    admin: 'Ezegate Admin',
    resident: 'Ezegate',
    guard: 'Ezegate Guard',
  },
  colors: {
    light: {
      // Teal-based palette — placeholder, edit to the real Ezegate
      // brand colors when they're finalised.
      primary: '#0d9488',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      accent: '#ccfbf1',
      accentForeground: '#0f172a',
      card: '#ffffff',
      cardForeground: '#0f172a',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#0d9488',
      background: '#ffffff',
      foreground: '#0f172a',
      sidebar: '#f8fafc',
      sidebarForeground: '#0f172a',
      success: '#22c55e',
      warning: '#f59e0b',
      logoAccent: '#0d9488',
    },
    dark: {
      primary: '#14b8a6',
      primaryForeground: '#ffffff',
      secondary: '#1e293b',
      secondaryForeground: '#f8fafc',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      muted: '#1e293b',
      mutedForeground: '#94a3b8',
      accent: '#134e4a',
      accentForeground: '#f8fafc',
      card: '#0f172a',
      cardForeground: '#f8fafc',
      border: '#334155',
      input: '#334155',
      ring: '#14b8a6',
      background: '#020617',
      foreground: '#f8fafc',
      sidebar: '#0f172a',
      sidebarForeground: '#f8fafc',
      success: '#22c55e',
      warning: '#f59e0b',
      logoAccent: '#14b8a6',
    },
  },
};
