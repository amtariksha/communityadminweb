import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StaffContent from './staff-content';
import { employeeExportRows, formatDuration, salaryFromInput } from './staff-fields';
import type { Staff } from '@/hooks/use-staff';

/**
 * STAFF-01 — the Staff page sends and reads the API's field names: Assign
 * Staff posts effective_from / effective_until, Edit sends `name`, dates come
 * from join_date, effective_from / effective_until and start_date / end_date.
 */

const EMPLOYEE: Staff = {
  id: 'staff-1',
  tenant_id: 't1',
  name: 'Test Cleaner',
  phone: '+910000000041',
  staff_type: 'housekeeping',
  designation: null,
  id_proof_type: null,
  id_proof_number: null,
  address: '12 Test Lane',
  emergency_contact: null,
  photo_url: null,
  join_date: '2026-09-01',
  exit_date: null,
  salary: '15000.00',
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const mocks = vi.hoisted(() => ({
  assign: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  exportArgs: { data: [] as Record<string, unknown>[], columns: [] as Array<{ key: string }> },
}));

vi.mock('@/components/ui/export-button', () => ({
  ExportButton: (props: { data: Record<string, unknown>[]; columns: Array<{ key: string }> }) => {
    mocks.exportArgs = props;
    return null;
  },
}));
vi.mock('@/components/ui/user-search-select', () => ({ UserSearchSelect: () => null }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

vi.mock('@/hooks', () => {
  const mutation = (fn?: () => void) => () => ({ mutate: fn ?? vi.fn(), isPending: false });
  return {
    useStaffEmployees: () => ({ data: { data: [EMPLOYEE], total: 1 }, isLoading: false }),
    useStaffShifts: () => ({ data: [{ id: 'shift-1', name: 'Morning', start_time: '06:00:00', end_time: '14:00:00' }], isLoading: false }),
    useStaffAssignments: () => ({
      data: {
        data: [{ id: 'as-1', staff_id: 'staff-1', staff_name: 'Test Cleaner', shift_id: 'shift-1', shift_name: 'Morning', gate_id: 'g1', gate_name: 'Main', effective_from: '2026-11-01', effective_until: '2026-12-31', is_active: true }],
        total: 1,
      },
      isLoading: false,
    }),
    useStaffAttendance: () => ({ data: { data: [], total: 0 }, isLoading: false }),
    useStaffLeaves: () => ({
      data: {
        data: [{ id: 'lv-1', staff_id: 'staff-1', staff_name: 'Test Cleaner', leave_type: 'compensatory', start_date: '2026-11-03', end_date: '2026-11-04', reason: null, status: 'pending' }],
        total: 1,
      },
      isLoading: false,
    }),
    useGates: () => ({ data: [{ id: 'g1', name: 'Main' }], isLoading: false }),
    useCreateEmployee: () => ({ mutate: mocks.create, isPending: false }),
    useUpdateEmployee: () => ({ mutate: mocks.update, isPending: false }),
    useDeactivateEmployee: mutation(),
    useAssignStaff: () => ({ mutate: mocks.assign, isPending: false }),
    useClockIn: mutation(),
    useClockOut: mutation(),
    useApplyLeave: mutation(),
    useApproveLeave: mutation(),
    useRejectLeave: mutation(),
  };
});

vi.mock('@/hooks/use-staff', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-staff')>();
  return {
    ...actual,
    useStaffShifts: () => ({ data: [{ id: 'shift-1', name: 'Morning', start_time: '06:00:00', end_time: '14:00:00' }], isLoading: false }),
    useCreateShift: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateShift: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteShift: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

afterEach(() => vi.clearAllMocks());

const openTab = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('StaffContent', () => {
  it('shows the join date from join_date', () => {
    render(<StaffContent />);
    const row = screen.getByText('Test Cleaner').closest('tr') as HTMLElement;
    expect(within(row).getByText('01 Sept 2026')).toBeTruthy();
  });

  it('assigns staff with effective_from / effective_until', () => {
    render(<StaffContent />);
    openTab('Shifts & Assignments');
    fireEvent.click(screen.getByRole('button', { name: /Assign Staff/ }));

    fireEvent.change(screen.getByLabelText('Staff Member'), { target: { value: 'staff-1' } });
    fireEvent.change(screen.getByLabelText('Gate'), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Shift'), { target: { value: 'shift-1' } });
    fireEvent.change(screen.getByLabelText('From Date'), { target: { value: '2026-11-01' } });
    fireEvent.submit(screen.getByLabelText('From Date').closest('form') as HTMLFormElement);

    const payload = mocks.assign.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({ staff_id: 'staff-1', gate_id: 'g1', shift_id: 'shift-1', effective_from: '2026-11-01', effective_until: undefined });
    expect(payload).not.toHaveProperty('from_date');
  });

  it('shows an assignment’s From and Until dates', () => {
    render(<StaffContent />);
    openTab('Shifts & Assignments');
    const row = screen.getAllByText('Morning').map((el) => el.closest('tr')).find(Boolean) as HTMLElement;
    expect(within(row).getByText('01 Nov 2026')).toBeTruthy();
    expect(within(row).getByText('31 Dec 2026')).toBeTruthy();
  });

  it('shows a leave’s start and end dates', () => {
    render(<StaffContent />);
    openTab('Leaves');
    const row = screen.getByText('Test Cleaner').closest('tr') as HTMLElement;
    expect(within(row).getByText('03 Nov 2026')).toBeTruthy();
    expect(within(row).getByText('04 Nov 2026')).toBeTruthy();
  });

  it('sends a rename as `name`, with the salary', () => {
    render(<StaffContent />);
    fireEvent.click(within(screen.getByText('Test Cleaner').closest('tr') as HTMLElement).getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('Edit'));

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed Cleaner' } });
    expect((screen.getByLabelText('Monthly Salary (₹)') as HTMLInputElement).value).toBe('15000');
    fireEvent.submit(screen.getByLabelText('Name').closest('form') as HTMLFormElement);

    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      id: 'staff-1',
      data: { name: 'Renamed Cleaner', address: '12 Test Lane', salary: 15000 },
    });
  });

  it('exports Status as Active / Inactive and the join date', () => {
    render(<StaffContent />);
    expect(mocks.exportArgs.columns.map((column) => column.key)).toEqual(['name', 'staff_type', 'phone', 'status', 'join_date']);
    expect(mocks.exportArgs.data[0]).toMatchObject({ status: 'Active', join_date: '2026-09-01' });
  });
});

describe('staff fields', () => {
  it('maps is_active to Active / Inactive', () => {
    expect(employeeExportRows([{ ...EMPLOYEE, is_active: false, join_date: '2026-09-01T00:00:00.000Z' }])[0]).toMatchObject({
      status: 'Inactive',
      join_date: '2026-09-01',
    });
  });

  it('formats 480 minutes as 8h 0m and an open row as -', () => {
    expect(formatDuration(480)).toBe('8h 0m');
    expect(formatDuration(null)).toBe('-');
  });

  it('reads a salary, blank as none, and refuses zero or junk', () => {
    expect(salaryFromInput('15000')).toEqual({ ok: true, value: 15000 });
    expect(salaryFromInput(' ')).toEqual({ ok: true, value: undefined });
    for (const text of ['0', '-5', 'abc', '12.345']) expect(salaryFromInput(text).ok).toBe(false);
  });
});
