import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BadgeCard } from '@/hooks/use-staff-badges';
import { ApiError } from '@/lib/api-error';
import { BadgeQrCodes } from './badge-qr-codes';
import { BadgeScansContent } from './scans/badge-scans-content';

/** Release 4 — Rotate QR on the print page and the badge scan log. */

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));

const wrap = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
};

const card = (patch: Partial<BadgeCard> = {}): BadgeCard => ({
  badge_id: '11111111-1111-4111-8111-111111111111',
  badge_no: '501',
  qr_token: 'a'.repeat(32),
  kind: 'Official',
  name: 'Test Cleaner',
  category: 'Housekeeping',
  status: 'active',
  badge_valid_until: null,
  units: null,
  photo_url: null,
  qr_rotated_at: null,
  ...patch,
});

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('Rotate QR', () => {
  it('issues a new QR for the badge after a confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.post.mockResolvedValue({ data: { badge_id: card().badge_id, badge_no: '501', qr_token: 'b'.repeat(32), qr_rotated_at: '2026-10-24T10:00:00Z' } });
    wrap(<BadgeQrCodes cards={[card()]} />);
    expect(screen.getByText('With the badge')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Issue new QR' }));
    });

    expect(api.post).toHaveBeenCalledWith(`/staff/badges/${card().badge_id}/rotate-qr`, {});
    await waitFor(() => expect(screen.getByText(/New QR issued/)).toBeTruthy());
  });

  it('does nothing when the confirm is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    wrap(<BadgeQrCodes cards={[card()]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Issue new QR' }));
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('offers nothing against an API whose cards carry no badge id', () => {
    const { container } = wrap(<BadgeQrCodes cards={[card({ badge_id: undefined })]} />);
    expect(container.textContent).toBe('');
  });
});

describe('Badge scans', () => {
  it('lists who scanned what, where and the result', async () => {
    api.get.mockResolvedValue({
      data: [{ id: 's1', scanned_at: '2026-10-24T04:30:00Z', scanned_by_name: 'Test Guard', gate_name: 'Test Main Gate', result: 'not_found', badge_no: null, holder_name: null }],
      total: 1,
    });
    wrap(<BadgeScansContent />);
    expect(await screen.findByText('Test Guard')).toBeTruthy();
    // The row's result, besides the filter's option of the same name.
    expect(screen.getAllByText('Unknown QR')).toHaveLength(2);
    expect(screen.getByText('Test Main Gate')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/staff/badges/scans', { params: { page: '1', limit: '25' } });
  });

  it('filters by result', async () => {
    api.get.mockResolvedValue({ data: [], total: 0 });
    wrap(<BadgeScansContent />);
    await waitFor(() => expect(screen.getByText('No badge scans match.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Result'), { target: { value: 'inactive' } });
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/staff/badges/scans', { params: { page: '1', limit: '25', result: 'inactive' } }),
    );
  });

  it('says not available yet against an older API', async () => {
    api.get.mockRejectedValue(new ApiError(404, { statusCode: 404, message: 'Cannot GET /staff/badges/scans' } as never));
    wrap(<BadgeScansContent />);
    await waitFor(() => expect(screen.getByText('Badge scans are not available yet on this server.')).toBeTruthy());
  });
});
