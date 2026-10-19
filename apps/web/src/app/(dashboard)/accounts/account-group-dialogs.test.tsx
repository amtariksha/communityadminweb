import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AccountGroup } from '@communityos/shared';
import {
  AddAccountGroupDialog,
  EditAccountGroupDialog,
  InlineAccountGroupDialog,
} from './account-group-dialogs';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/hooks', () => ({
  useCreateAccountGroup: () => ({ mutate: mocks.createGroup, isPending: false }),
  useUpdateAccountGroup: () => ({ mutate: mocks.updateGroup, isPending: false }),
}));

function group(overrides: Partial<AccountGroup>): AccountGroup {
  return {
    id: 'g-1',
    tenant_id: 't-1',
    name: 'Reserves',
    type: 'equity',
    parent_id: null,
    level: 1,
    code: '3000',
    is_active: true,
    sort_order: 0,
    ...overrides,
  };
}

const GROUPS = [
  group({ id: 'g-equity', name: 'Reserves', type: 'equity' }),
  group({ id: 'g-asset', name: 'Current Assets', type: 'asset', code: '1000' }),
];

afterEach(() => vi.clearAllMocks());

function fillCreateForm(type: string): void {
  fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'Sinking Fund' } });
  fireEvent.change(screen.getByLabelText('Group Code'), { target: { value: '3100' } });
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: type } });
}

describe('InlineAccountGroupDialog', () => {
  it('offers Equity and sends it to the API', () => {
    render(<InlineAccountGroupDialog open onOpenChange={vi.fn()} groups={GROUPS} onCreated={vi.fn()} />);

    fillCreateForm('equity');
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    expect(mocks.createGroup).toHaveBeenCalledWith(
      { name: 'Sinking Fund', code: '3100', type: 'equity', parent_id: null },
      expect.anything(),
    );
  });

  it('lists only parents of the chosen type, since a child must share its parent\'s type', () => {
    render(<InlineAccountGroupDialog open onOpenChange={vi.fn()} groups={GROUPS} onCreated={vi.fn()} />);

    fillCreateForm('equity');
    const parent = screen.getByLabelText(/Parent Group/) as HTMLSelectElement;
    const names = Array.from(parent.options).map((option) => option.textContent);

    expect(names).toEqual(['No parent (root group)', 'Reserves']);
  });

  it('hands the created group back so the account form can select it', () => {
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    mocks.createGroup.mockImplementation((_input, options) => {
      options.onSuccess({ data: group({ id: 'g-new' }) });
    });
    render(<InlineAccountGroupDialog open onOpenChange={onOpenChange} groups={GROUPS} onCreated={onCreated} />);

    fillCreateForm('equity');
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'g-new' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('AddAccountGroupDialog', () => {
  it('offers the same five types, Equity among them', () => {
    render(<AddAccountGroupDialog groups={GROUPS} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Group/ }));

    const type = screen.getByLabelText('Type') as HTMLSelectElement;
    expect(Array.from(type.options).map((option) => option.value)).toEqual([
      'asset', 'liability', 'equity', 'income', 'expense',
    ]);
  });
});

describe('EditAccountGroupDialog', () => {
  it('shows the type read-only and saves only name and code', () => {
    render(<EditAccountGroupDialog group={GROUPS[0]} onClose={vi.fn()} />);

    const type = screen.getByLabelText('Type') as HTMLInputElement;
    expect(type.value).toBe('Equity');
    expect(type.readOnly).toBe(true);
    expect(type.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Group Name'), { target: { value: 'General Reserve' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.updateGroup).toHaveBeenCalledWith(
      { id: 'g-equity', data: { name: 'General Reserve', code: '3000' } },
      expect.anything(),
    );
  });

  it('is closed while no group is chosen', () => {
    render(<EditAccountGroupDialog group={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Edit Account Group')).toBeNull();
  });
});
