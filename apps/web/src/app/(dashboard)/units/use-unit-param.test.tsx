import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpenUnitParam } from './use-unit-param';

/**
 * `/units?unit=<id>` opens that unit's dialog (UNIT-12: the classic unit
 * panel's "View/Edit Unit details" until UNIT-16), then drops the parameter.
 */

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/units',
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace }),
}));

const unitQuery = vi.hoisted(() => ({ calls: [] as string[], data: undefined as unknown }));
vi.mock('@/hooks', () => ({
  useUnit: (id: string) => {
    unitQuery.calls.push(id);
    return { data: id ? unitQuery.data : undefined };
  },
}));

const UNIT = { id: 'u-1', unit_number: '101', block: 'A', floor: 1, area_sqft: 900, unit_type: 'residential', is_active: true };

describe('useOpenUnitParam', () => {
  beforeEach(() => {
    nav.replace.mockReset();
    unitQuery.calls = [];
    unitQuery.data = UNIT;
  });

  it('opens the unit named by ?unit= once, then drops the parameter', () => {
    nav.search = 'unit=u-1';
    const open = vi.fn();

    const { rerender } = renderHook(() => useOpenUnitParam(open));
    rerender();

    expect(unitQuery.calls[0]).toBe('u-1');
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(UNIT);
    expect(nav.replace).toHaveBeenCalledWith('/units');
  });

  it('does nothing without the parameter', () => {
    nav.search = '';
    const open = vi.fn();

    renderHook(() => useOpenUnitParam(open));

    expect(open).not.toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('waits for the unit to load', () => {
    nav.search = 'unit=u-1';
    unitQuery.data = undefined;
    const open = vi.fn();

    renderHook(() => useOpenUnitParam(open));

    expect(open).not.toHaveBeenCalled();
  });
});
