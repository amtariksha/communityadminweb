import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChangeLog } from './change-log';

/** View User Edits (ASSET-10, screen ASSET-S8): who changed which asset, old → new. */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/ui/user-search-select', () => ({ UserSearchSelect: (): ReactNode => null }));
const audit = vi.hoisted(() => ({ filters: vi.fn() }));
vi.mock('@/hooks/use-audit', () => ({
  useAuditLog: (filters: unknown) => {
    audit.filters(filters);
    return {
      isLoading: false,
      data: {
        total: 1,
        data: [
          {
            id: 'log-1',
            action: 'update',
            entity_type: 'asset',
            entity_id: 'a-1',
            old_data: { name: 'Treadmill', location: 'Gym' },
            new_data: { name: 'Treadmill', location: 'Clubhouse' },
            user_name: 'Asha Test',
            ip_address: '',
            created_at: '2026-10-10T10:00:00Z',
          },
        ],
      },
    };
  },
}));

describe('ChangeLog', () => {
  it('shows the location change with who made it, linked to the asset', () => {
    render(<ChangeLog recordTypes={['asset', 'amc_contract']} recordLabel="Asset" recordHref={(entry) => `/asset-inventory/assets/${entry.entity_id}`} />);

    expect(audit.filters).toHaveBeenLastCalledWith(expect.objectContaining({ entity_type: 'asset,amc_contract', page: 1 }));
    expect(screen.getByText('Asha Test')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Treadmill' }).getAttribute('href')).toBe('/asset-inventory/assets/a-1');
    expect(screen.getByText('Gym')).toBeTruthy();
    expect(screen.getByText('Clubhouse')).toBeTruthy();
  });
});
