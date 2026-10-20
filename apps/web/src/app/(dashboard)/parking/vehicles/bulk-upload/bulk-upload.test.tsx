import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParkingBulkUpload } from './bulk-upload-content';

/** PARK-11 — the vehicles sheet and the slot bulk create on one page, each to its import. */

const mocks = vi.hoisted(() => ({ post: vi.fn(), role: 'community_admin', upload: null as string | null }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, get: vi.fn().mockResolvedValue({ data: [], total: 0 }), download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams(mocks.upload ? `upload=${mocks.upload}` : '') }));

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ParkingBulkUpload />
    </QueryClientProvider>,
  );
}

describe('Vehicles › Bulk Upload', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.role = 'community_admin';
  });

  it('opens with the slots first from the Slots tab and sends typed slots to the slots import', async () => {
    mocks.upload = 'slots';
    renderPage();
    fireEvent.change(screen.getByLabelText('Slot No, row 1'), { target: { value: 'P-1' } });
    mocks.post.mockResolvedValueOnce({ data: { batch_id: 'b', type: 'parking_slots', file_name: null, total_rows: 1, valid_rows: 1, error_rows: 0, skip_rows: 0, invalid_rows: 'skip', can_apply: true, already_applied: null, rows: [] } });
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]);
    });
    expect(mocks.post).toHaveBeenCalledWith('/parking/imports/parking_slots/preview', { rows: [{ slot_number: 'P-1' }] });
    mocks.upload = null;
  });

  it('lets a committee member upload vehicles but not slots', () => {
    mocks.role = 'committee_member';
    renderPage();
    expect((screen.getByLabelText('Upload vehicles: file') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText('Slot No, row 1') as HTMLInputElement).disabled).toBe(true);
  });
});
