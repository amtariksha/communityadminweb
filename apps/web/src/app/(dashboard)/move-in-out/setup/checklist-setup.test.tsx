import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChecklistSetup } from './checklist-setup';
import { validateChecklist } from './checklist-grid';

/** MOVE-S2 / S3 — the add-entry box, the grid (Check List · Enabled?) and Save Changes. */

const mocks = vi.hoisted(() => ({ items: [] as unknown, save: vi.fn(), role: 'committee_member' as string | null }));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/hooks/use-move-checklists', () => ({
  useChecklistItems: () => ({ data: mocks.items, isLoading: false, isError: false, dataUpdatedAt: 1 }),
  useSaveChecklistItems: () => ({ mutateAsync: mocks.save, isPending: false }),
}));

const ITEMS = [
  { id: 'i-1', label: 'Keys handed over', position: 1, is_enabled: true, used: true },
  { id: 'i-2', label: 'Agreement copy received', position: 2, is_enabled: false, used: false },
];

afterEach(() => {
  vi.clearAllMocks();
  mocks.role = 'committee_member';
});

describe('Setup › Move In / Move Out CheckList', () => {
  it('shows the list with its Enabled? ticks under the phase heading', () => {
    mocks.items = ITEMS;
    render(<ChecklistSetup phase="in" />);
    expect(screen.getByRole('heading', { name: 'Customize Move-In CheckList' })).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Move In CheckList' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['S.No', 'Check List', 'Enabled?', 'Order']);
    expect((within(table).getByLabelText('Enabled?, row 2') as HTMLInputElement).checked).toBe(false);
  });

  it('adds an entry at the end of the list and saves it', async () => {
    mocks.items = ITEMS;
    mocks.save.mockResolvedValue([]);
    render(<ChecklistSetup phase="out" />);
    fireEvent.change(screen.getByLabelText('Add New Entry in Move Out Check List'), { target: { value: ' Access cards returned ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Entry to Move Out CheckList' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][0]).toEqual({
      rows: [
        { id: 'i-1', label: 'Keys handed over', is_enabled: true },
        { id: 'i-2', label: 'Agreement copy received', is_enabled: false },
        { label: 'Access cards returned', is_enabled: true },
      ],
    });
  });

  it('refuses an entry already in the list, ignoring case', () => {
    mocks.items = ITEMS;
    render(<ChecklistSetup phase="in" />);
    fireEvent.change(screen.getByLabelText('Add New Entry in Move In Check List'), { target: { value: 'keys handed over' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Entry to Move In CheckList' }));
    expect(screen.getByRole('alert').textContent).toContain('already in the list');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('saves the grid as the whole list in order', async () => {
    mocks.items = ITEMS;
    mocks.save.mockResolvedValue([]);
    render(<ChecklistSetup phase="in" />);
    fireEvent.click(screen.getByLabelText('Enabled?, row 2'));
    fireEvent.click(screen.getByRole('button', { name: 'Move row 2 up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][0].rows.map((row: { label: string; is_enabled: boolean }) => [row.label, row.is_enabled])).toEqual([
      ['Agreement copy received', true],
      ['Keys handed over', true],
    ]);
  });

  it('is read-only for other roles; says when the server does not have it', () => {
    mocks.role = 'accountant';
    mocks.items = [];
    const { unmount } = render(<ChecklistSetup phase="in" />);
    expect(screen.queryByRole('button', { name: /Add Entry/ })).toBeNull();
    expect(screen.getByText('No checklist items yet.')).toBeTruthy();
    unmount();
    mocks.items = null;
    render(<ChecklistSetup phase="in" />);
    expect(screen.getByText(/not available yet/)).toBeTruthy();
  });

  it('checks labels: 1 to 200 characters, no repeats', () => {
    const row = (key: string, label: string, id?: string) => ({ key, id, values: { label, is_enabled: true }, inactive: false });
    expect(validateChecklist([row('a', 'Keys', 'i-1'), row('b', 'KEYS', 'i-2'), row('c', '')])).toEqual({ b: '"KEYS" is already in the list.' });
    expect(validateChecklist([row('a', ' ', 'i-1')])).toEqual({ a: 'A checklist item is 1 to 200 characters.' });
  });
});
