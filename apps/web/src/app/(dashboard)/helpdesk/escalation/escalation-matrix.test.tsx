import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EscalationRow } from '@/hooks';
import EscalationContent from './escalation-content';
import { EXPORT_COLUMNS, toExportRows } from './escalation-matrix';
import { validateEscalationDraft } from './escalation-row-editor';

/**
 * Escalation: one row per category with its owners and windows, and a row
 * editor. The matrix the editor saves is what the hourly job follows, so
 * the editor refuses a window that has nowhere to send the request.
 */

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  role: 'community_admin' as string | null,
  rows: [] as EscalationRow[],
  save: vi.fn(),
  sms: false,
}));

vi.mock('@/hooks', () => ({
  useEscalationMatrix: () => ({ data: mocks.rows, isLoading: false, isError: false }),
  useNotificationChannels: () => ({ data: { email: true, sms: mocks.sms, sms_essential: false, sms_message_max: 120 } }),
  useHelpdeskAssignees: () => ({
    data: [
      { user_id: 'u1', name: 'Test Admin One', roles: ['community_admin'] },
      { user_id: 'u2', name: 'Test Admin Two', roles: ['accountant'] },
      { user_id: 'u3', name: 'Test Admin Three', roles: ['committee_member'] },
    ],
    isLoading: false,
    isError: false,
  }),
  useSaveEscalationRow: () => ({
    mutateAsync: async (input: { categoryId: string; body: Record<string, unknown> }) => {
      mocks.save(input);
      mocks.rows = mocks.rows.map((row) =>
        row.category_id === input.categoryId
          ? { ...row, escalation_l1_l2_hours: input.body.escalation_l1_l2_hours as number | null }
          : row,
      );
      return {};
    },
    isPending: false,
  }),
}));

vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

function row(overrides: Partial<EscalationRow> & Pick<EscalationRow, 'category_id' | 'category_name'>): EscalationRow {
  return {
    display_order: 10,
    owner_l1_user_id: 'u1',
    owner_l1_name: 'Test Admin One',
    escalation_l1_l2_hours: null,
    owner_l2_user_id: null,
    owner_l2_name: null,
    escalation_l2_l3_hours: null,
    owner_l3_user_id: null,
    owner_l3_name: null,
    sla_hours: 24,
    default_priority: 'medium',
    handled_by: 'facility',
    ...overrides,
  };
}

const THREE_CATEGORIES: EscalationRow[] = [
  row({
    category_id: 'c1',
    category_name: 'Plumbing',
    escalation_l1_l2_hours: 4,
    owner_l2_user_id: 'u2',
    owner_l2_name: 'Test Admin Two',
    escalation_l2_l3_hours: 2,
    owner_l3_user_id: 'u3',
    owner_l3_name: 'Test Admin Three',
  }),
  row({ category_id: 'c2', category_name: 'Electrical', owner_l1_name: 'Test Admin One' }),
  row({ category_id: 'c3', category_name: 'Gas' }),
];

beforeEach(() => {
  mocks.rows = THREE_CATEGORIES.map((r) => ({ ...r }));
  mocks.role = 'community_admin';
  mocks.save.mockClear();
  mocks.addToast.mockClear();
});

const tableRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const cells = (rowElement: HTMLElement) =>
  within(rowElement).getAllByRole('cell').map((cell) => cell.textContent?.trim());

describe('Escalation matrix', () => {
  it('numbers one row per category and shows owners and windows, "—" where blank', () => {
    render(<EscalationContent />);

    expect(tableRows()).toHaveLength(3);
    expect(cells(tableRows()[0]).slice(0, 10)).toEqual([
      '1', 'Plumbing', 'Test Admin One', 'No', '4 hrs', 'Test Admin Two', 'No', '2 hrs', 'Test Admin Three', 'No',
    ]);
    expect(cells(tableRows()[1]).slice(0, 10)).toEqual([
      '2', 'Electrical', 'Test Admin One', 'No', '—', '—', 'No', '—', '—', 'No',
    ]);
  });

  it('offers "View" on every row', () => {
    render(<EscalationContent />);

    expect(screen.getAllByRole('button', { name: /^View/ })).toHaveLength(3);
  });

  it('says where to start when the society has no category yet', () => {
    mocks.rows = [];
    render(<EscalationContent />);

    expect(screen.getByText('Add categories in Setup first')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Setup/ }).getAttribute('href')).toBe('/helpdesk/setup/categories');
  });

  it('saves new windows from the editor and shows them without a reload', async () => {
    render(<EscalationContent />);

    fireEvent.click(screen.getByRole('button', { name: 'View Electrical' }));
    const editor = screen.getByRole('dialog');
    fireEvent.change(within(editor).getByLabelText('Escalation Window L1 to L2 (hours)'), { target: { value: '6' } });
    fireEvent.change(within(editor).getByLabelText('Owner L2'), { target: { value: 'u2' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][0]).toMatchObject({
      categoryId: 'c2',
      body: {
        owner_l1_user_id: 'u1',
        escalation_l1_l2_hours: 6,
        owner_l2_user_id: 'u2',
        escalation_l2_l3_hours: null,
        owner_l3_user_id: null,
        sla_hours: 24,
        default_priority: 'medium',
        handled_by: 'facility',
      },
    });
    await waitFor(() => expect(cells(tableRows()[1])[4]).toBe('6 hrs'));
  });

  it('lets the team that handles the category be chosen, facility to start with', async () => {
    render(<EscalationContent />);

    fireEvent.click(screen.getByRole('button', { name: 'View Gas' }));
    const editor = screen.getByRole('dialog');
    const team = within(editor).getByLabelText('Handled by') as HTMLSelectElement;
    expect(team.value).toBe('facility');
    expect(within(team).getAllByRole('option').map((option) => option.textContent)).toEqual(['Security', 'Facility', 'Office']);

    fireEvent.change(team, { target: { value: 'security' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][0].body.handled_by).toBe('security');
  });

  it('refuses a window with no owner for the next level, and sends nothing', () => {
    render(<EscalationContent />);

    fireEvent.click(screen.getByRole('button', { name: 'View Electrical' }));
    const editor = screen.getByRole('dialog');
    fireEvent.change(within(editor).getByLabelText('Escalation Window L1 to L2 (hours)'), { target: { value: '6' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));

    expect(within(editor).getByText('Choose the Level 2 owner for this window.')).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('opens read-only for a role that may view but not edit', () => {
    mocks.role = 'accountant';
    render(<EscalationContent />);

    fireEvent.click(screen.getByRole('button', { name: 'View Plumbing' }));
    const editor = screen.getByRole('dialog');

    expect((within(editor).getByLabelText('Owner L1') as HTMLSelectElement).disabled).toBe(true);
    expect((within(editor).getByLabelText('Handled by') as HTMLSelectElement).disabled).toBe(true);
    expect(within(editor).queryByRole('button', { name: 'Save' })).toBeNull();
  });
});

describe('validateEscalationDraft', () => {
  const draft = {
    ownerL1: 'u1',
    windowL1L2: '',
    ownerL2: '',
    windowL2L3: '',
    ownerL3: '',
    slaHours: '24',
    defaultPriority: 'medium',
    handledBy: 'facility',
    smsL1: false,
    smsL2: false,
    smsL3: false,
  };

  it('accepts a matrix that stops at Level 1', () => {
    expect(validateEscalationDraft(draft)).toEqual({});
  });

  it('needs a Level 1 owner', () => {
    expect(validateEscalationDraft({ ...draft, ownerL1: '' })).toEqual({
      ownerL1: 'Choose the Level 1 owner.',
    });
  });

  it('needs whole hours from 1 to 720 in a window', () => {
    for (const bad of ['0', '721', '1.5', 'abc']) {
      expect(validateEscalationDraft({ ...draft, windowL1L2: bad, ownerL2: 'u2' })).toEqual({
        windowL1L2: 'Enter whole hours from 1 to 720.',
      });
    }
  });

  it('needs the Level 2 owner for the first window', () => {
    expect(validateEscalationDraft({ ...draft, windowL1L2: '4' })).toEqual({
      ownerL2: 'Choose the Level 2 owner for this window.',
    });
  });

  it('needs the first window before the second', () => {
    expect(validateEscalationDraft({ ...draft, windowL2L3: '2', ownerL3: 'u3' })).toEqual({
      windowL2L3: 'Set the Level 1 to Level 2 window first.',
    });
  });

  it('needs the Level 3 owner for the second window', () => {
    expect(validateEscalationDraft({ ...draft, windowL1L2: '4', ownerL2: 'u2', windowL2L3: '2' })).toEqual({
      ownerL3: 'Choose the Level 3 owner for this window.',
    });
  });

  it('needs resolve-within hours from 1 to 720', () => {
    expect(validateEscalationDraft({ ...draft, slaHours: '' })).toEqual({
      slaHours: 'Enter whole hours from 1 to 720.',
    });
  });
});

describe('export', () => {
  it('lists every row with the columns in screen order', () => {
    const exported = toExportRows(THREE_CATEGORIES);

    expect(EXPORT_COLUMNS.map((column) => column.label)).toEqual([
      'Sl.No',
      'Category',
      'Owner L1',
      'Owner L1 SMS',
      'Escalation Window L1 to L2',
      'Owner L2',
      'Owner L2 SMS',
      'Escalation Window L2 to L3',
      'Owner L3',
      'Owner L3 SMS',
    ]);
    expect(exported).toHaveLength(3);
    expect(exported[0]).toMatchObject({
      serial: 1,
      category: 'Plumbing',
      owner_l1: 'Test Admin One',
      window_l1_l2: '4 hrs',
      owner_l2: 'Test Admin Two',
      window_l2_l3: '2 hrs',
      owner_l3: 'Test Admin Three',
    });
    expect(exported[2]).toMatchObject({ serial: 3, window_l1_l2: '—', owner_l2: '—' });
  });
});

// HELP-10 — the SMS ticks per level.
describe('SMS ticks (HELP-10)', () => {
  it('are disabled with "SMS is not set up" until SMS is configured', () => {
    mocks.sms = false;
    mocks.rows = THREE_CATEGORIES;
    render(<EscalationContent />);

    fireEvent.click(screen.getByRole('button', { name: 'View Plumbing' }));
    const editor = screen.getByRole('dialog');

    expect((within(editor).getByLabelText('Owner L2 SMS') as HTMLInputElement).disabled).toBe(true);
    expect(within(editor).getByText('SMS is not set up.')).toBeTruthy();
  });

  it('save the level ticked once SMS is set up', async () => {
    mocks.sms = true;
    mocks.rows = THREE_CATEGORIES;
    render(<EscalationContent />);

    fireEvent.click(screen.getByRole('button', { name: 'View Plumbing' }));
    const editor = screen.getByRole('dialog');
    fireEvent.click(within(editor).getByLabelText('Owner L2 SMS'));
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls.at(-1)?.[0].body).toMatchObject({ owner_l1_sms: false, owner_l2_sms: true, owner_l3_sms: false });
    mocks.sms = false;
  });

  it('show Yes / No in the matrix', () => {
    expect(toExportRows([{ ...THREE_CATEGORIES[0], owner_l3_sms: true }])[0]).toMatchObject({ sms_l1: 'No', sms_l3: 'Yes' });
  });
});
