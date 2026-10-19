import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeForm } from './employee-form';
import { badgeValidUntil } from './staff-record';

/**
 * The employee form (STAFF-10, SB-07): the standard dialog and the classic
 * Add Staff page are the same fields and payload in two presentations.
 */

vi.mock('@/components/ui/user-search-select', () => ({
  UserSearchSelect: ({ onQueryChange }: { onQueryChange: (q: string) => void }) => (
    <input aria-label="Phone search" onChange={(event) => onQueryChange(event.target.value)} />
  ),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: toast }) }));

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), nextBadge: null as string | null }));
vi.mock('@/hooks', () => ({
  useCreateEmployee: () => ({ mutate: mocks.create, isPending: false, error: null }),
  useUpdateEmployee: () => ({ mutate: mocks.update, isPending: false, error: null }),
}));
vi.mock('@/hooks/use-next-badge', () => ({ useNextBadge: () => ({ data: mocks.nextBadge }) }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

function fill(): void {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Watchman' } });
  fireEvent.change(screen.getByLabelText('Phone search'), { target: { value: '0000000046' } });
  fireEvent.change(screen.getByLabelText('Staff Type'), { target: { value: 'watchman' } });
}

const PAYLOAD = { name: 'Test Watchman', phone: '+910000000046', staff_type: 'watchman' };

beforeEach(() => {
  mocks.create.mockReset();
  mocks.update.mockReset();
  mocks.nextBadge = null;
  toast.mockReset();
});

describe('EmployeeForm', () => {
  it('in a dialog: Cancel and Save, and Save adds the employee', () => {
    render(<EmployeeForm mode="dialog" open onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    fill();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.create.mock.calls[0][0]).toMatchObject(PAYLOAD);
  });

  it('as a page: Add Staff, Save and New and Close, with the same payload', () => {
    const onClose = vi.fn();
    render(<EmployeeForm mode="page" onClose={onClose} onSaved={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Staff' })).toBeTruthy();
    fill();

    fireEvent.click(screen.getByRole('button', { name: 'Save and New' }));
    expect(mocks.create.mock.calls[0][0]).toMatchObject(PAYLOAD);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses a blank name before calling the API', () => {
    render(<EmployeeForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Name is required' }));
  });

  // STAFF-20: the badge and profile fields of STAFF-S3.
  it('pre-fills Badge No. with the next free number and sends the record', () => {
    mocks.nextBadge = '105';
    render(<EmployeeForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText('Badge No.') as HTMLInputElement).value).toBe('105');
    fill();
    fireEvent.change(screen.getByLabelText('Badge Issued On'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Badge validity'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'female' } });
    fireEvent.change(screen.getByLabelText('Languages'), { target: { value: 'Kannada' } });

    expect(screen.getByTestId('badge-valid-till').textContent).toBe('30 Jun 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      ...PAYLOAD,
      badge_no: '105',
      badge_issued_on: '2026-01-01',
      badge_validity_months: 6,
      gender: 'female',
      languages: 'Kannada',
    });
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('exit_date');
  });

  it('leaves a blank badge out on Add, so the API gives the next number', () => {
    render(<EmployeeForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Add Staff' }));

    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('badge_no');
  });

  it('reads the saved badge on Edit, keeps its validity and sends the Leaving Date', () => {
    const employee = {
      id: 's1',
      tenant_id: 't',
      name: 'Test Guard',
      phone: '+910000000047',
      staff_type: 'security_guard',
      designation: null,
      id_proof_type: null,
      id_proof_number: null,
      address: null,
      emergency_contact: null,
      photo_url: null,
      join_date: '2026-01-01',
      exit_date: null,
      salary: null,
      badge_no: '17',
      badge_issued_on: '2026-03-01T00:00:00.000Z',
      badge_valid_until: '2026-05-31T00:00:00.000Z',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as const;
    render(<EmployeeForm mode="page" employee={employee} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect((screen.getByLabelText('Badge validity') as HTMLSelectElement).value).toBe('3');
    fireEvent.change(screen.getByLabelText('Leaving Date'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      id: 's1',
      data: { badge_no: '17', badge_issued_on: '2026-03-01', badge_validity_months: 3, exit_date: '2026-10-31' },
    });
  });
});

describe('badgeValidUntil (web)', () => {
  it('matches the API rule', () => {
    expect(badgeValidUntil('2026-01-01', 6)).toBe('2026-06-30');
    expect(badgeValidUntil('2026-08-31', 6)).toBe('2027-02-28');
    expect(badgeValidUntil('2026-01-01', 0)).toBeNull();
  });
});
