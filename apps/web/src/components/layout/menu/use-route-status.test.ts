import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRouteStatus } from './use-route-status';

const nav = vi.hoisted(() => ({ pathname: '/helpdesk/closed' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

const SCOPES = [
  { slug: 'open', label: 'Open Requests' },
  { slug: 'closed', label: 'Closed Requests' },
] as const;

describe('useRouteStatus', () => {
  it('is the status of the current route', () => {
    const { result } = renderHook(() => useRouteStatus('/helpdesk', SCOPES));

    expect(result.current?.slug).toBe('closed');
  });

  it('is nothing off the status lists', () => {
    nav.pathname = '/helpdesk/escalation';
    const { result } = renderHook(() => useRouteStatus('/helpdesk', SCOPES));

    expect(result.current).toBeUndefined();
  });
});
