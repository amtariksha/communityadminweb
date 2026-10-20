import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { ConsentContent } from './consent-content';

/**
 * Units & Users › Consent Activity (UNIT-37, screen UNIT-S17): the read-only
 * table (Sl No. · User Name · Block & Unit · the two categories · View Logs),
 * the log of one person, and "not available yet" before the API is deployed.
 */
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));

const state = vi.hoisted(() => ({
  list: {} as Record<string, unknown>,
  history: { data: undefined as unknown, isLoading: false, isError: false },
  filters: [] as unknown[],
}));

vi.mock('@/hooks/use-consents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-consents')>();
  return {
    ...actual,
    useConsents: (filters: unknown) => {
      state.filters.push(filters);
      return state.list;
    },
    useConsentHistory: (userId: string | null) => (userId ? state.history : { data: undefined, isLoading: false, isError: false }),
  };
});

const ROWS = [
  { user_id: 'u-1', name: 'Asha Rao', units: 'A - 101', essential_updates: true, third_party_offers: false, updated_at: null },
  { user_id: 'u-2', name: 'Dev Menon', units: 'B - 201', essential_updates: null, third_party_offers: null, updated_at: null },
];

describe('ConsentContent', () => {
  beforeEach(() => {
    state.filters = [];
    state.list = { data: { data: ROWS, total: 2 }, isLoading: false, isError: false, error: null, refetch: vi.fn() };
    state.history = {
      data: {
        name: 'Asha Rao',
        data: [{ id: 'h-1', category: 'third_party_offers', old_value: true, new_value: false, changed_at: '2026-10-20T05:00:00Z', source: 'resident_app' }],
      },
      isLoading: false,
      isError: false,
    };
  });

  it('shows each person as Given, Withdrawn or Not answered, 100 a page', () => {
    render(<ConsentContent />);
    for (const header of ['Sl No.', 'User Name', 'Block & Unit', 'Essential Community Updates', 'Third-Party Deals and Offers', 'Action']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeTruthy();
    }
    const asha = screen.getByRole('row', { name: /Asha Rao/ });
    expect(within(asha).getByText('Given')).toBeTruthy();
    expect(within(asha).getByText('Withdrawn')).toBeTruthy();
    expect(within(screen.getByRole('row', { name: /Dev Menon/ })).getAllByText('Not answered')).toHaveLength(2);
    expect(state.filters[0]).toMatchObject({ page: 1, limit: 100, category: '', answer: '' });
  });

  it("opens a person's log: Category · Old → New · Changed On · Source", () => {
    render(<ConsentContent />);
    fireEvent.click(within(screen.getByRole('row', { name: /Asha Rao/ })).getByRole('button', { name: 'View Logs' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Third-Party Deals and Offers')).toBeTruthy();
    expect(within(dialog).getByText('Given → Withdrawn')).toBeTruthy();
    expect(within(dialog).getByText('Resident app')).toBeTruthy();
  });

  it('says so when nobody has answered', () => {
    state.list = { data: { data: [], total: 0 }, isLoading: false, isError: false, error: null, refetch: vi.fn() };
    render(<ConsentContent />);
    expect(screen.getByText('No consent answers yet.')).toBeTruthy();
  });

  it('says "not available yet" when the API does not have the list', () => {
    state.list = { data: undefined, isLoading: false, isError: true, error: new ApiError(404, { message: 'Not Found' } as never), refetch: vi.fn() };
    render(<ConsentContent />);
    expect(screen.getByText('Consent Activity is not available yet on this server.')).toBeTruthy();
  });
});
