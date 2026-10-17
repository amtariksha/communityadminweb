import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnitCategorySelect } from './unit-category-select';

/**
 * UNIT-07 — a unit can be given a member category from the Details tab.
 */

const CATEGORIES = [
  { id: 'cat-1', name: 'Founding members', description: null, color: '#000000' },
  { id: 'cat-2', name: 'Staff quarters', description: null, color: '#000000' },
];

function options(): Array<{ value: string; label: string | null }> {
  const select = screen.getByLabelText('Member category') as HTMLSelectElement;
  return Array.from(select.querySelectorAll('option')).map((option) => ({
    value: option.value,
    label: option.textContent,
  }));
}

describe('UnitCategorySelect', () => {
  it('offers "No category" and then every category of the society', () => {
    render(<UnitCategorySelect categories={CATEGORIES} value="" onChange={vi.fn()} />);

    expect(options()).toEqual([
      { value: '', label: 'No category' },
      { value: 'cat-1', label: 'Founding members' },
      { value: 'cat-2', label: 'Staff quarters' },
    ]);
  });

  it("shows the unit's current category", () => {
    render(<UnitCategorySelect categories={CATEGORIES} value="cat-2" onChange={vi.fn()} />);

    expect((screen.getByLabelText('Member category') as HTMLSelectElement).value).toBe('cat-2');
  });

  it('reports the chosen category id, and an empty string for "No category"', () => {
    const onChange = vi.fn();
    render(<UnitCategorySelect categories={CATEGORIES} value="cat-1" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Member category'), { target: { value: 'cat-2' } });
    fireEvent.change(screen.getByLabelText('Member category'), { target: { value: '' } });

    expect(onChange).toHaveBeenNthCalledWith(1, 'cat-2');
    expect(onChange).toHaveBeenNthCalledWith(2, '');
  });

  it('is left out when the society has no categories and the unit has none', () => {
    render(<UnitCategorySelect categories={[]} value="" onChange={vi.fn()} />);

    expect(screen.queryByLabelText('Member category')).toBeNull();
  });

  it('still shows a category the unit holds when the list has not loaded', () => {
    render(<UnitCategorySelect categories={[]} value="cat-9" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Member category')).toBeTruthy();
  });
});
