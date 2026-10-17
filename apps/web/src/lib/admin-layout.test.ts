import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyStoredLayout,
  layoutStorageKey,
  normalizeAdminLayout,
  prePaintLayoutScript,
  readStoredLayout,
  storeLayout,
} from './admin-layout';
import { TENANT_STORAGE_KEY } from './auth';

const TENANT = '11111111-1111-4111-8111-111111111111';

function runPrePaintScript(): void {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the
  // script is ours; this is exactly how the browser runs it.
  new Function(prePaintLayoutScript())();
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-layout');
  vi.restoreAllMocks();
});

describe('normalizeAdminLayout', () => {
  it.each([
    ['classic', 'classic'],
    ['standard', 'standard'],
    ['fancy', 'standard'],
    [undefined, 'standard'],
    [null, 'standard'],
    ['CLASSIC', 'standard'],
  ])('%p → %p', (input, expected) => {
    expect(normalizeAdminLayout(input)).toBe(expected);
  });
});

describe('stored layout per society', () => {
  it('round-trips a layout under the society key', () => {
    storeLayout(TENANT, 'classic');
    expect(localStorage.getItem(layoutStorageKey(TENANT))).toBe('classic');
    expect(readStoredLayout(TENANT)).toBe('classic');
  });

  it('returns null when nothing is stored or no society is selected', () => {
    expect(readStoredLayout(TENANT)).toBeNull();
    expect(readStoredLayout(null)).toBeNull();
  });

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => storeLayout(TENANT, 'classic')).not.toThrow();
    expect(readStoredLayout(TENANT)).toBeNull();
  });
});

describe('pre-paint script', () => {
  it('marks the page classic when the selected society is stored as classic', () => {
    localStorage.setItem(TENANT_STORAGE_KEY, TENANT);
    localStorage.setItem(layoutStorageKey(TENANT), 'classic');
    runPrePaintScript();
    expect(document.documentElement.getAttribute('data-layout')).toBe('classic');
  });

  it('marks the page standard for another society', () => {
    localStorage.setItem(TENANT_STORAGE_KEY, 'another-society');
    localStorage.setItem(layoutStorageKey(TENANT), 'classic');
    runPrePaintScript();
    expect(document.documentElement.getAttribute('data-layout')).toBe('standard');
  });

  it('marks the page standard when no society is selected', () => {
    runPrePaintScript();
    expect(document.documentElement.getAttribute('data-layout')).toBe('standard');
  });

  it('falls back to standard when storage throws', () => {
    const root = { setAttribute: vi.fn() };
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(applyStoredLayout(storage, root, TENANT_STORAGE_KEY, 'cos.layout.')).toBe('standard');
    expect(root.setAttribute).toHaveBeenCalledWith('data-layout', 'standard');
  });
});
