import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatisticsContent } from './statistics-content';

/** UNIT-31 — Statistics: "n in N" lines, categories, Filter and Bulk Invite. */

const mocks = vi.hoisted(() => ({
  stats: undefined as unknown,
  candidates: undefined as unknown,
  lastCriterion: null as string | null,
  invite: vi.fn(),
  inviteOn: false,
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/auth', () => ({
  getCurrentTenant: () => 't1',
  getUser: () => ({ societies: [{ id: 't1', name: 'Green Meadows', display_name: null }] }),
}));
vi.mock('@/hooks/use-resident-settings', () => ({ useResidentSettings: () => ({ data: { invite_email_enabled: mocks.inviteOn } }) }));
vi.mock('@/hooks/use-adoption', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-adoption')>()),
  useAdoptionStats: () => ({ isLoading: false, data: mocks.stats }),
  useAdoptionCandidates: (criterion: string | null) => {
    mocks.lastCriterion = criterion;
    return { data: criterion ? mocks.candidates : undefined, refetch: vi.fn() };
  },
  useBulkInvite: () => ({ mutate: mocks.invite, isPending: false }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inviteOn = false;
  mocks.stats = {
    ratios: [
      { key: 'owners', label: 'Owners on the app', count: 4, of: 10 },
      { key: 'tenants', label: 'Tenants on the app', count: 1, of: 2 },
    ],
    categories: [{ key: 'never_logged_in', label: 'Never logged in', count: 7 }],
  };
  mocks.candidates = {
    total: 2,
    data: [
      { member_id: 'm1', name: 'Test Owner', unit: 'A-101', member_type: 'owner', last_login_at: null, invited_on: null },
      { member_id: 'm2', name: 'Test Tenant', unit: 'B-202', member_type: 'tenant', last_login_at: null, invited_on: '2026-10-01T05:00:00Z' },
    ],
  };
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('Units & Users statistics', () => {
  it('shows the society heading, "n in N" lines and the category counts', () => {
    render(<StatisticsContent />);

    expect(screen.getByRole('heading', { name: 'Green Meadows App Statistics' })).toBeTruthy();
    expect(screen.getByLabelText('App usage').textContent).toContain('Owners on the app: 4 in 10');
    expect(screen.getByLabelText('Categories').textContent).toContain('Never logged in7');
  });

  it('filters by the chosen criterion and invites everyone listed', () => {
    render(<StatisticsContent />);
    expect((screen.getByRole('button', { name: 'Bulk Invite' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Not invited yet'));
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));

    expect(mocks.lastCriterion).toBe('not_invited');
    expect(screen.getByText('2 people match this filter.')).toBeTruthy();
    expect(screen.getByText('Test Tenant')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bulk Invite' }));
    expect(mocks.invite).toHaveBeenCalledWith(['m1', 'm2'], expect.anything());
  });

  it('says invite e-mails are off until switched on', () => {
    render(<StatisticsContent />);
    expect(screen.getByText(/Invite e-mails are off/)).toBeTruthy();
  });

  it('says so on a server without Statistics', () => {
    mocks.stats = null;
    render(<StatisticsContent />);
    expect(screen.getByText(/not available yet/)).toBeTruthy();
  });
});
