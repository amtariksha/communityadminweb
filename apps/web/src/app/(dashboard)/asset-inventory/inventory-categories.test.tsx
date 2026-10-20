import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridChange, GridRowState } from '@/components/editable-grid';
import { AlertRecipientsForm } from './setup/inventory-categories/alert-recipients-form';
import { InventoryCategoriesContent } from './setup/inventory-categories/inventory-categories-content';
import {
  toInventoryCategoryRows,
  validateInventoryCategories,
  type InventoryCategoryValues,
} from './setup/inventory-categories/inventory-categories-grid';

/** Setup Inventory Categories (ASSET-17, ASSET-S2): the grid, the recipients and the page before the API has them. */

const mocks = vi.hoisted(() => ({ categories: vi.fn(), recipients: vi.fn() }));
vi.mock('@/hooks/use-inventory-setup', () => ({
  useInventoryCategories: () => mocks.categories(),
  useSaveInventoryCategories: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAlertRecipients: () => mocks.recipients(),
  useSaveAlertRecipients: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const role = vi.hoisted(() => ({ value: 'community_admin' }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => role.value }));

const row = (key: string, name: string, id?: string, inactive = false): GridRowState<InventoryCategoryValues> =>
  ({ key, id, values: { name }, inactive }) as GridRowState<InventoryCategoryValues>;

const ADMINS = [
  { user_id: 'u-1', name: 'Asha Rao', roles: ['community_admin'], ticked: false },
  { user_id: 'u-2', name: 'Vikram Shetty', roles: ['accountant', 'committee_member'], ticked: false },
];

describe('inventory categories grid', () => {
  it('sends the whole list, a retired row as is_active false, and checks names', () => {
    const change = { rows: [row('a', ' Electrical ', 'c-1'), row('b', 'Paint', 'c-2', true), row('c', 'Garden')] } as unknown as GridChange<InventoryCategoryValues>;
    expect(toInventoryCategoryRows(change)).toEqual([
      { id: 'c-1', name: 'Electrical', is_active: true },
      { id: 'c-2', name: 'Paint', is_active: false },
      { name: 'Garden', is_active: true },
    ]);
    expect(validateInventoryCategories([row('a', 'Civil', 'c-1'), row('b', 'civil'), row('c', '')])).toEqual({ b: '"civil" is already in the list.' });
  });
});

describe('low-stock alert recipients', () => {
  it('says nobody will be told until someone is ticked, then saves the ticked admins', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<AlertRecipientsForm candidates={ADMINS} readOnly={false} isSaving={false} save={save} />);
    expect(screen.getByText('Nobody will be told when stock runs low.')).toBeTruthy();
    expect(screen.getByText('Accountant, Committee Member')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tell Vikram Shetty' }));
    expect(screen.queryByText('Nobody will be told when stock runs low.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(['u-2']));
  });
});

describe('Setup Inventory Categories page', () => {
  beforeEach(() => {
    role.value = 'community_admin';
    mocks.categories.mockReturnValue({ isLoading: false, data: [{ id: 'c-1', name: 'Electrical', is_active: true, sort_order: 1, items: 3 }], dataUpdatedAt: 1 });
    mocks.recipients.mockReturnValue({ isLoading: false, data: ADMINS, dataUpdatedAt: 1 });
  });

  it('shows the categories grid and the recipients', () => {
    render(<InventoryCategoriesContent />);
    expect(screen.getByDisplayValue('Electrical')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Tell Asha Rao' })).toBeTruthy();
  });

  it('says it is not available yet before the API has it', () => {
    mocks.categories.mockReturnValue({ isLoading: false, error: { status: 404 } });
    mocks.recipients.mockReturnValue({ isLoading: false, error: { status: 404 } });
    render(<InventoryCategoriesContent />);
    expect(screen.getByText('Setup Inventory Categories is not available yet.')).toBeTruthy();
    expect(screen.getByText('Low-stock alerts are not available yet.')).toBeTruthy();
  });

  it('leaves the recipients to the committee', () => {
    role.value = 'accountant';
    render(<InventoryCategoriesContent />);
    expect(screen.getByText('The committee chooses who is told when stock runs low.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull();
  });
});
