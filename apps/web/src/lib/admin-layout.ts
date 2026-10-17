import { TENANT_STORAGE_KEY } from './auth';

/**
 * Per-society admin layout (requirements SB-01). `standard` is today's
 * admin panel; `classic` is the arrangement, density and wording the
 * committee of one of our first societies already knows. The society's
 * choice comes from the API with its society entry; the browser keeps a
 * copy per society so the right look is on screen before React starts.
 */
export type AdminLayout = 'standard' | 'classic';

export const DEFAULT_ADMIN_LAYOUT: AdminLayout = 'standard';
export const LAYOUT_ATTRIBUTE = 'data-layout';
export const LAYOUT_STORAGE_PREFIX = 'cos.layout.';

interface StorageLike {
  getItem(key: string): string | null;
}

interface AttributeTarget {
  setAttribute(name: string, value: string): void;
}

export function normalizeAdminLayout(value: unknown): AdminLayout {
  return value === 'classic' ? 'classic' : 'standard';
}

export function layoutStorageKey(tenantId: string): string {
  return `${LAYOUT_STORAGE_PREFIX}${tenantId}`;
}

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // Storage disabled (private mode, blocked site data).
    return null;
  }
}

export function readStoredLayout(tenantId: string | null): AdminLayout | null {
  if (!tenantId) return null;
  try {
    const stored = browserStorage()?.getItem(layoutStorageKey(tenantId));
    return stored === null || stored === undefined ? null : normalizeAdminLayout(stored);
  } catch {
    return null;
  }
}

export function storeLayout(tenantId: string, layout: AdminLayout): void {
  try {
    browserStorage()?.setItem(layoutStorageKey(tenantId), layout);
  } catch {
    // Best effort: without storage the next load briefly shows standard.
  }
}

export function applyLayoutAttribute(
  layout: AdminLayout,
  root: AttributeTarget | null = typeof document === 'undefined' ? null : document.documentElement,
): void {
  root?.setAttribute(LAYOUT_ATTRIBUTE, layout);
}

/**
 * Reads the selected society and its stored layout, and marks the page.
 * Runs as an inline script before first paint, so it must not reference
 * anything outside its own body: it is serialised with toString().
 */
export function applyStoredLayout(
  storage: StorageLike | null,
  root: AttributeTarget,
  tenantKey: string,
  layoutPrefix: string,
): AdminLayout {
  let layout: AdminLayout = 'standard';
  try {
    const tenantId = storage ? storage.getItem(tenantKey) : null;
    if (storage && tenantId && storage.getItem(layoutPrefix + tenantId) === 'classic') {
      layout = 'classic';
    }
  } catch {
    layout = 'standard';
  }
  root.setAttribute('data-layout', layout);
  return layout;
}

export function prePaintLayoutScript(): string {
  const storage = '(function(){try{return window.localStorage}catch(e){return null}})()';
  const args = [
    storage,
    'document.documentElement',
    JSON.stringify(TENANT_STORAGE_KEY),
    JSON.stringify(LAYOUT_STORAGE_PREFIX),
  ].join(',');
  return `(${applyStoredLayout.toString()})(${args});`;
}
