import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovedContent, last90Days } from './approved-content';

/** Approved Move Ins (MOVE-06, screen MOVE-S7): last 90 days by default, Account, export. */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/date', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/date')>()),
  todayIST: () => '2026-10-19',
}));
const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));
vi.mock('@/hooks/use-approvals', () => ({ useApprovalDetail: () => ({ data: { steps: [] } }) }));

const mocks = vi.hoisted(() => ({ moveIns: vi.fn() }));
vi.mock('@/hooks/use-move-ins', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-move-ins')>()),
  useMoveIns: (filters: Record<string, unknown>) => mocks.moveIns(filters),
}));

beforeEach(() => {
  mocks.moveIns.mockReset().mockReturnValue({
    data: {
      data: [
        {
          approval_id: 'ar-5',
          request_type: 'tenant_onboarding',
          onboarding_id: 'on-5',
          name: 'Test Moved In',
          phone: '+910000000052',
          block: 'A',
          unit_number: '101',
          member_type: 'tenant',
          requested_at: '2026-10-10T04:00:00.000Z',
          requested_by_name: 'Test Owner',
          lease_start_date: null,
          lease_end_date: null,
          approved_at: '2026-10-12T04:00:00.000Z',
          approved_by_name: 'Test Secretary',
          account_created: true,
        },
      ],
      total: 1,
    },
    isLoading: false,
  });
  download.mockReset().mockResolvedValue(new Blob(['x']));
});

describe('Approved Move Ins', () => {
  it('opens on the last 90 days and shows Account = Created', () => {
    render(<ApprovedContent />);

    expect(mocks.moveIns).toHaveBeenCalledWith(expect.objectContaining({ state: 'approved', from: '2026-07-21', to: '2026-10-19' }));
    expect(screen.getByRole('heading', { name: 'User Account Created' })).toBeTruthy();
    expect(screen.getByText('Created')).toBeTruthy();
    expect(screen.getByText('Test Secretary')).toBeTruthy();
  });

  it('exports the whole filtered register', async () => {
    render(<ApprovedContent />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    });

    expect(download).toHaveBeenCalledWith('/tenant-lifecycle/move-ins/export', {
      params: { state: 'approved', from: '2026-07-21', to: '2026-10-19', format: 'csv' },
    });
  });

  it('works out the 90 days on India dates', () => {
    expect(last90Days('2026-03-01')).toEqual({ from: '2025-12-01', to: '2026-03-01' });
  });
});
