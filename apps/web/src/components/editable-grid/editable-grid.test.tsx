import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditableGrid, type GridColumn, type GridChange } from './index';

interface Shift {
  name: string;
  hours: string;
  night: boolean;
}

const columns: GridColumn<Shift>[] = [
  { key: 'name', header: 'Shift', kind: 'text', field: 'name' },
  { key: 'hours', header: 'Hours', kind: 'number', field: 'hours', min: 1, max: 24 },
  { key: 'night', header: 'Night', kind: 'checkbox', field: 'night' },
];

const saved = [
  { id: 's1', values: { name: 'Morning', hours: '8', night: false } },
  { id: 's2', values: { name: 'Night', hours: '12', night: true } },
];

function renderGrid(props: Partial<React.ComponentProps<typeof EditableGrid<Shift>>> = {}) {
  const onSave = vi.fn<(change: GridChange<Shift>) => void>();
  render(
    <EditableGrid<Shift>
      label="Shifts"
      columns={columns}
      rows={saved}
      blank={() => ({ name: '', hours: '', night: false })}
      spareRows={2}
      deactivate={{ header: 'Retire', label: 'Retire' }}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave };
}

const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

describe('EditableGrid (SB-08)', () => {
  it('shows the saved rows, numbered, then the spare blank rows', () => {
    renderGrid();

    expect(box('Shift, row 1').value).toBe('Morning');
    expect(box('Hours, row 2').value).toBe('12');
    expect(box('Night, row 2').checked).toBe(true);
    expect(box('Shift, row 4').value).toBe('');
    expect(screen.queryByLabelText('Shift, row 5')).toBeNull();
  });

  it('hands the page every kind of change in one save', () => {
    const { onSave } = renderGrid();

    fireEvent.change(box('Hours, row 1'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retire row 2' }));
    fireEvent.change(box('Shift, row 3'), { target: { value: 'Evening' } });
    fireEvent.click(box('Night, row 3'));
    save();

    const change = onSave.mock.calls[0][0];
    expect(change.upserts.map((row) => [row.id, row.values])).toEqual([
      ['s1', { name: 'Morning', hours: '9', night: false }],
      [undefined, { name: 'Evening', hours: '', night: true }],
    ]);
    expect(change.deactivations.map((row) => row.id)).toEqual(['s2']);
  });

  it('keeps a row marked inactive on screen, struck through, until undone', () => {
    renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Retire row 1' }));
    expect(box('Shift, row 1').className).toContain('line-through');
    fireEvent.click(screen.getByRole('button', { name: 'Undo retire row 1' }));
    expect(box('Shift, row 1').className).not.toContain('line-through');
  });

  it('moves rows when ordering is on', () => {
    const { onSave } = renderGrid({ reorder: true });

    fireEvent.click(screen.getByRole('button', { name: 'Move row 2 up' }));
    expect(box('Shift, row 1').value).toBe('Night');
    save();
    expect(onSave.mock.calls[0][0].rows.map((row) => [row.id, row.position])).toEqual([
      ['s2', 1],
      ['s1', 2],
    ]);
  });

  it('sends nothing while the page’s check finds an error, and shows it on the row', () => {
    const validate = vi.fn().mockImplementation((rows: Array<{ key: string; values: Shift }>) =>
      Object.fromEntries(rows.filter((row) => row.values.name === 'Bad').map((row) => [row.key, 'Not allowed.'])),
    );
    const { onSave } = renderGrid({ validate });

    fireEvent.change(box('Shift, row 1'), { target: { value: 'Bad' } });
    save();

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Not allowed.');
    fireEvent.change(box('Shift, row 1'), { target: { value: 'Good' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the errors the server returns on their rows', async () => {
    const onSave = vi.fn().mockImplementation((change: GridChange<Shift>) => ({
      rowErrors: { [change.rows[1].key]: 'Already used.' },
    }));
    renderGrid({ onSave });

    save();

    expect((await screen.findByRole('alert')).textContent).toBe('Already used.');
  });

  it('is read-only for a role that may not change it', () => {
    renderGrid({ readOnly: true });

    expect(box('Shift, row 1').disabled).toBe(true);
    expect(screen.queryByLabelText('Shift, row 3')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retire row 1' })).toBeNull();
  });

  it('adds more spare rows on request', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: 'Add 2 more rows' }));
    expect(box('Shift, row 6')).toBeTruthy();
  });
});

describe('EditableGrid saved by its page (GL-13)', () => {
  it('has no Save Changes, reports each change and shows the page’s errors', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <EditableGrid<Shift>
        label="Shifts"
        columns={columns}
        rows={saved}
        blank={() => ({ name: '', hours: '', night: false })}
        spareRows={1}
        hideSave
        onChange={onChange}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();

    fireEvent.change(box('Shift, row 1'), { target: { value: 'Early' } });
    const { change, rows } = onChange.mock.calls.at(-1)?.[0];
    expect(change.upserts.map((row: { values: Shift }) => row.values.name)).toEqual(['Early']);

    rerender(
      <EditableGrid<Shift>
        label="Shifts"
        columns={columns}
        rows={saved}
        blank={() => ({ name: '', hours: '', night: false })}
        spareRows={1}
        hideSave
        onChange={onChange}
        errors={{ [rows[1].key]: 'Name already used' }}
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('Name already used');
  });
});
