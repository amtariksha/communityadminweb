import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldDef } from '@/hooks/use-resident-fields';
import { FieldsSetup, previewFields } from './fields-setup';

/** MOVE-S4 / S5 — the field grid's columns and rules, one Save Changes, Preview Form. */

const mocks = vi.hoisted(() => ({ defs: [] as unknown, save: vi.fn(), role: 'community_admin' as string | null }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/hooks/use-resident-fields', () => ({
  useFieldDefs: () => ({ data: mocks.defs, isLoading: false, isError: false, dataUpdatedAt: 1 }),
  useSaveFieldDefs: () => ({ mutateAsync: mocks.save, isPending: false }),
}));

const def = (overrides: Partial<FieldDef>): FieldDef => ({
  id: `id-${overrides.key}`,
  phase: 'in',
  key: 'x',
  label: '',
  position: 0,
  is_enabled: false,
  type: 'text',
  choices: null,
  applies_to: 'both',
  binding: null,
  is_predefined: true,
  read_only: false,
  ...overrides,
});

const DEFS = [
  def({ key: 'serial_number', label: 'Serial Number', position: 0 }),
  def({ key: 'ownership_status', label: 'Ownership Status', position: 8, type: 'single', choices: ['Sole Owner', 'Co-Owner', 'Related to Owner'] }),
  def({ key: 'spare_1', position: 20, is_predefined: false }),
];

afterEach(() => {
  vi.clearAllMocks();
  mocks.role = 'community_admin';
});

describe('Setup › Custom Fields For Move-in', () => {
  it('shows the screen’s columns, predefined names fixed and spare names typed', () => {
    mocks.defs = DEFS;
    render(<FieldsSetup phase="in" />);
    expect(screen.getByRole('heading', { name: 'Customize Move-in Fields by Admin' })).toBeTruthy();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No', 'Display Order', 'Field Name', 'Enabled?', 'Text / Date / Multiple Choice', 'Multiple Choices', 'Owner', 'Tenant', 'Both Owner and Tenant',
    ]);
    expect(within(table).getByText('Ownership Status')).toBeTruthy();
    expect((screen.getByLabelText('Text / Date / Multiple Choice, row 2') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('Field Name, row 3') as HTMLInputElement).disabled).toBe(false);
  });

  it('refuses a Single / Multiple spare without choices, naming the row', async () => {
    mocks.defs = DEFS;
    render(<FieldsSetup phase="in" />);
    fireEvent.change(screen.getByLabelText('Field Name, row 3'), { target: { value: 'Pets' } });
    fireEvent.change(screen.getByLabelText('Text / Date / Multiple Choice, row 3'), { target: { value: 'single' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Row 3');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('saves every row: predefined ones keep their stored name, type and choices', async () => {
    mocks.defs = DEFS;
    mocks.save.mockResolvedValue([]);
    render(<FieldsSetup phase="in" />);
    fireEvent.click(screen.getByLabelText('Enabled?, row 2'));
    fireEvent.click(screen.getByLabelText('Owner, row 2'));
    fireEvent.change(screen.getByLabelText('Field Name, row 3'), { target: { value: 'Pets' } });
    fireEvent.change(screen.getByLabelText('Text / Date / Multiple Choice, row 3'), { target: { value: 'multiple' } });
    fireEvent.change(screen.getByLabelText('Multiple Choices, row 3'), { target: { value: 'Dog, Cat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const rows = mocks.save.mock.calls[0][0].rows;
    expect(rows[1]).toEqual({
      id: 'id-ownership_status', position: 8, label: 'Ownership Status', is_enabled: true, type: 'single',
      choices: ['Sole Owner', 'Co-Owner', 'Related to Owner'], applies_to: 'owner',
    });
    expect(rows[2]).toMatchObject({ label: 'Pets', type: 'multiple', choices: ['Dog', 'Cat'] });
  });

  it('previews the saved form for an owner or a tenant', () => {
    mocks.defs = [def({ key: 'profession', label: 'Profession', is_enabled: true, applies_to: 'owner' }), def({ key: 'serial_number', label: 'Serial Number', is_enabled: true })];
    render(<FieldsSetup phase="in" />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview Form' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Profession')).toBeTruthy();
    fireEvent.click(within(dialog).getByLabelText('Tenant'));
    expect(within(dialog).queryByText('Profession')).toBeNull();
    expect(previewFields(mocks.defs as FieldDef[], 'tenant').map((d) => d.key)).toEqual(['serial_number']);
  });

  it('is read-only for other roles and says when the server does not have it', () => {
    mocks.role = 'committee_member';
    mocks.defs = DEFS;
    const { unmount } = render(<FieldsSetup phase="in" />);
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
    unmount();
    mocks.defs = null;
    render(<FieldsSetup phase="out" />);
    expect(screen.getByText(/not available yet/)).toBeTruthy();
  });
});
