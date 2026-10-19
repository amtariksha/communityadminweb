import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeForm } from './employee-form';

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

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock('@/hooks', () => ({
  useCreateEmployee: () => ({ mutate: mocks.create, isPending: false, error: null }),
  useUpdateEmployee: () => ({ mutate: mocks.update, isPending: false, error: null }),
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
});
