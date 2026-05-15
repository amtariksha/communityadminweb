import type { Brand } from './types';

/**
 * Ezgate — DEFAULT brand. Colors mirror the values that have shipped
 * on the admin web since #2563eb (slate blue) was adopted as the
 * primary, with the orange #F5A623 logo accent kept as a contrasting
 * tile color.
 *
 * Edit values here freely — every token is consumed by CSS variables
 * in `globals.css` (light + dark) and replicated as `<style>` tag
 * overrides at runtime via `BrandStyles` in `layout.tsx`.
 */
export const ezgateBrand: Brand = {
  id: 'ezgate',
  appName: 'Ezgate',
  tagline: 'Society Management Platform',
  logoLetter: 'e',
  legalEntity: 'Ezgate',
  appLabels: {
    admin: 'Ezgate Admin',
    resident: 'Ezgate',
    guard: 'Ezgate Guard',
  },
  colors: {
    light: {
      primary: '#2563eb',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      accent: '#f1f5f9',
      accentForeground: '#0f172a',
      card: '#ffffff',
      cardForeground: '#0f172a',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#2563eb',
      background: '#ffffff',
      foreground: '#0f172a',
      sidebar: '#f8fafc',
      sidebarForeground: '#0f172a',
      success: '#22c55e',
      warning: '#f59e0b',
      logoAccent: '#F5A623',
    },
    dark: {
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      secondary: '#1e293b',
      secondaryForeground: '#f8fafc',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      muted: '#1e293b',
      mutedForeground: '#94a3b8',
      accent: '#1e293b',
      accentForeground: '#f8fafc',
      card: '#0f172a',
      cardForeground: '#f8fafc',
      border: '#334155',
      input: '#334155',
      ring: '#3b82f6',
      background: '#020617',
      foreground: '#f8fafc',
      sidebar: '#0f172a',
      sidebarForeground: '#f8fafc',
      success: '#22c55e',
      warning: '#f59e0b',
      logoAccent: '#F5A623',
    },
  },
};
