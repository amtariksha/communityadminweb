import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CountedSelect } from './counted-select';

describe('CountedSelect', () => {
  it('reads "name (n)" for every option and reports the choice', () => {
    const onChange = vi.fn();
    const { container } = render(
      <CountedSelect
        id="category"
        label="Category"
        value=""
        onChange={onChange}
        allLabel="All"
        allCount={6}
        options={[
          { value: 'c1', label: 'Plumbing', count: 4 },
          { value: 'c2', label: 'Electrical', count: 2 },
        ]}
      />,
    );
    const select = container.querySelector('select#category') as HTMLSelectElement;

    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'All (6)',
      'Plumbing (4)',
      'Electrical (2)',
    ]);
    fireEvent.change(select, { target: { value: 'c1' } });
    expect(onChange).toHaveBeenCalledWith('c1');
  });
});
