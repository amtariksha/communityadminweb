import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddUsersContent } from './add-users-content';

/**
 * Units & Users › Add Users (UNIT-14, screen UNIT-S3): ten numbered rows,
 * Create User Accounts sends the filled ones in one request and each row
 * shows its result.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const state = vi.hoisted(() => ({ role: 'community_admin', importMembers: vi.fn() }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => state.role }));
vi.mock('../../helpdesk/new/use-unit-choices', () => ({
  useUnitChoices: () => ({
    data: [
      { id: 'u-1', unit_number: '101', block: 'A' },
      { id: 'u-2', unit_number: '102', block: 'A' },
    ],
  }),
}));
vi.mock('@/hooks/use-units', () => ({
  useBulkImportMembers: () => ({ mutateAsync: state.importMembers, isPending: false }),
}));

function fillRow(position: number, values: { first: string; unit: string; phone: string; type: string }): void {
  fireEvent.change(screen.getByLabelText(`First Name, row ${position}`), { target: { value: values.first } });
  fireEvent.change(screen.getByLabelText(`Unit No, row ${position}`), { target: { value: values.unit } });
  fireEvent.change(screen.getByLabelText(`Phone/Mobile, row ${position}`), { target: { value: values.phone } });
  fireEvent.change(screen.getByLabelText(`Resident Type, row ${position}`), { target: { value: values.type } });
}

const dataRows = () => screen.getByRole('table', { name: 'Add Users' }).querySelectorAll('tbody tr');

describe('AddUsersContent', () => {
  beforeEach(() => {
    state.role = 'community_admin';
    state.importMembers.mockReset();
  });

  it('starts with ten numbered rows, adds ten more, and shows units as Block-Unit', () => {
    render(<AddUsersContent />);

    expect(dataRows()).toHaveLength(10);
    expect(screen.getAllByText('+91')).toHaveLength(10);
    expect(screen.getAllByRole('option', { name: 'A-101' })).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Add 10 more rows' }));
    expect(dataRows()).toHaveLength(20);
  });

  it('keeps Create User Accounts off while the grid is blank', () => {
    render(<AddUsersContent />);

    expect((screen.getByRole('button', { name: 'Create User Accounts' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends three filled rows in one request; created rows clear, the refused one keeps its values', async () => {
    state.importMembers.mockResolvedValue({
      data: {
        imported: 2,
        skipped: 1,
        errors: [],
        results: [
          { row: 1, status: 'imported' },
          { row: 2, status: 'skipped', error: 'No owner to attach to' },
          { row: 3, status: 'imported' },
        ],
      },
    });
    render(<AddUsersContent />);
    fillRow(1, { first: 'Test One', unit: 'u-1', phone: '9876543210', type: 'owner' });
    fillRow(2, { first: 'Test Two', unit: 'u-2', phone: '9876543211', type: 'owner_family' });
    fillRow(4, { first: 'Test Four', unit: 'u-2', phone: '9876543212', type: 'tenant' });

    fireEvent.click(screen.getByRole('button', { name: 'Create User Accounts' }));
    await act(async () => {});

    expect(state.importMembers).toHaveBeenCalledTimes(1);
    const sent = state.importMembers.mock.calls[0][0].members;
    expect(sent.map((member: { name: string }) => member.name)).toEqual(['Test One', 'Test Two', 'Test Four']);
    expect(sent[0]).toEqual({ unit_id: 'u-1', name: 'Test One', phone: '+919876543210', member_type: 'owner' });
    expect((screen.getByLabelText('First Name, row 1') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('First Name, row 2') as HTMLInputElement).value).toBe('Test Two');
    expect(screen.getByText('No owner to attach to')).toBeTruthy();
    expect(screen.getAllByText('Created')).toHaveLength(2);
  });

  it('marks an incomplete row without sending it', async () => {
    render(<AddUsersContent />);
    fireEvent.change(screen.getByLabelText('First Name, row 1'), { target: { value: 'Test Only' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create User Accounts' }));
    await act(async () => {});

    expect(state.importMembers).not.toHaveBeenCalled();
    expect(screen.getByText('Fill in Unit No, Phone/Mobile, Resident Type.')).toBeTruthy();
  });

  it('is read-only for a role that cannot create accounts', () => {
    state.role = 'committee_member';
    render(<AddUsersContent />);

    expect(screen.getByText('Only the community admin and the accountant can create user accounts.')).toBeTruthy();
    expect((screen.getByLabelText('First Name, row 1') as HTMLInputElement).disabled).toBe(true);
  });
});
