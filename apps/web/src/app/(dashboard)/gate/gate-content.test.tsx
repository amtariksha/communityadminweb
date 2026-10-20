import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GateContent from './gate-content';

/**
 * GATE-02 — the visitor export uses the API's field names, the parcel filter
 * offers the four statuses the table can hold, and the lists page past the
 * first 25 rows.
 */

const mocks = vi.hoisted(() => ({
  exportColumns: [] as Array<{ key: string; label: string }>,
  visitorCalls: [] as Array<Record<string, unknown> | undefined>,
  parcelCalls: [] as Array<Record<string, unknown> | undefined>,
  visitorTotal: 60,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/gate',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/components/ui/export-button', () => ({
  ExportButton: (props: { columns: Array<{ key: string; label: string }> }) => {
    mocks.exportColumns = props.columns;
    return null;
  },
}));

vi.mock('@/hooks', () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  const empty = () => ({ data: { data: [], total: 0 }, isLoading: false });
  return {
    useGateStats: () => ({ data: undefined, isLoading: false }),
    useVisitors: (filters?: Record<string, unknown>) => {
      mocks.visitorCalls.push(filters);
      return { data: { data: [], total: mocks.visitorTotal }, isLoading: false };
    },
    useStaffLogs: empty,
    useParcels: (filters?: Record<string, unknown>) => {
      mocks.parcelCalls.push(filters);
      return { data: { data: [], total: 0 }, isLoading: false };
    },
    useAnprLogs: empty,
    useUnrecognizedVehicles: empty,
    useGates: () => ({ data: [], isLoading: false }),
    useUnits: empty,
    useCreateVisitor: mutation,
    useWalkInVisitor: mutation,
    useCheckInVisitor: mutation,
    useCheckOutVisitor: mutation,
    useCancelVisitor: mutation,
    useStaffCheckIn: mutation,
    useStaffCheckOut: mutation,
    useCreateParcel: mutation,
    useCollectParcel: mutation,
    useAnprScan: mutation,
  };
});

vi.mock('@/hooks/use-regular-visitors', () => ({
  useRegularVisitors: () => ({ data: { data: [], total: 0 }, isLoading: false }),
  useDeactivateRegularVisitor: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-staff-categories', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-staff-categories')>()),
  useStaffCategories: () => ({ data: null }),
}));

beforeEach(() => {
  mocks.exportColumns = [];
  mocks.visitorCalls = [];
  mocks.parcelCalls = [];
  mocks.visitorTotal = 60;
});

describe('GateContent', () => {
  it('exports visitors under the API field names', () => {
    render(<GateContent />);

    expect(mocks.exportColumns.map((column) => column.key)).toEqual([
      'visitor_name',
      'visitor_phone',
      'purpose',
      'unit_number',
      'status',
      'checked_in_at',
      'checked_out_at',
    ]);
  });

  it('offers Received, Notified, Held and Collected on the parcel filter, and no Returned', () => {
    render(<GateContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Parcels' }));

    const filter = screen.getByLabelText('Parcel status') as HTMLSelectElement;
    const options = Array.from(filter.options).map((option) => option.textContent);
    expect(options).toEqual(['All Statuses', 'Received', 'Notified', 'Held', 'Collected']);

    fireEvent.change(filter, { target: { value: 'held' } });
    expect(mocks.parcelCalls.at(-1)).toMatchObject({ status: 'held', page: 1 });
  });

  it('pages through 60 visitors 25 at a time', () => {
    render(<GateContent />);

    expect(screen.getByText('Showing 1 to 25 of 60 entries')).toBeTruthy();
    expect(mocks.visitorCalls.at(-1)).toMatchObject({ page: 1, limit: 25 });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(mocks.visitorCalls.at(-1)).toMatchObject({ page: 2, limit: 25 });
    expect(screen.getByText('Showing 26 to 50 of 60 entries')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByText('Showing 51 to 60 of 60 entries')).toBeTruthy();
  });

  it('goes back to page 1 when the status filter changes', () => {
    render(<GateContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.change(screen.getByLabelText('Visitor status'), { target: { value: 'checked_in' } });

    expect(mocks.visitorCalls.at(-1)).toMatchObject({ status: 'checked_in', page: 1 });
  });
});
