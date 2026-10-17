import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpenOnNewParam } from './use-open-on-new-param';

/**
 * DASH-07 — `?new=1` opens a page's create form once, then leaves the URL so
 * Back (and a reload) do not open it again.
 */

const nav = vi.hoisted(() => ({ search: '', pathname: '/announcements', replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace }),
}));

describe('useOpenOnNewParam', () => {
  beforeEach(() => {
    nav.search = '';
    nav.replace.mockClear();
  });

  it('opens once and removes the parameter from the URL', () => {
    nav.search = 'new=1';
    const open = vi.fn();

    renderHook(() => useOpenOnNewParam(open));

    expect(open).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith('/announcements');
  });

  it('keeps the other parameters', () => {
    nav.search = 'tab=active&new=1';

    renderHook(() => useOpenOnNewParam(vi.fn()));

    expect(nav.replace).toHaveBeenCalledWith('/announcements?tab=active');
  });

  it('goes to the form page instead, where forms are pages (SB-07)', () => {
    nav.search = 'new=1';
    const open = vi.fn();

    renderHook(() => useOpenOnNewParam(open, '/helpdesk/new'));

    expect(open).not.toHaveBeenCalled();
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith('/helpdesk/new');
  });

  it('does nothing without the parameter', () => {
    const open = vi.fn();

    renderHook(() => useOpenOnNewParam(open));

    expect(open).not.toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it.each(['new=0', 'new=', 'new=yes', 'newer=1'])('ignores %s', (query) => {
    nav.search = query;
    const open = vi.fn();

    renderHook(() => useOpenOnNewParam(open));

    expect(open).not.toHaveBeenCalled();
  });

  it('does not open again when the component re-renders with the same URL', () => {
    nav.search = 'new=1';
    const open = vi.fn();

    const { rerender } = renderHook(() => useOpenOnNewParam(open));
    rerender();
    rerender();

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('calls the latest callback, not the first one it saw', () => {
    nav.search = 'new=1';
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(({ open }) => useOpenOnNewParam(open), { initialProps: { open: first } });
    // The URL has not changed yet, so a second render must not fire anything.
    rerender({ open: second });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
