import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogueParam } from '@/hooks/use-reports';
import { ReportParamField } from './report-param-fields';

const optionTexts = (label: string): string[] =>
  [...(screen.getByLabelText(label) as HTMLSelectElement).options].map((option) => option.textContent ?? '');

vi.mock('@/hooks/use-voting', () => ({
  usePolls: () => ({ data: { data: [{ id: 'p1', title: 'Repaint the gate?' }] } }),
}));
vi.mock('@/hooks/use-amenities', () => ({
  useAmenities: () => ({ data: { data: [{ id: 'a1', name: 'Party Hall' }] } }),
}));

/** The poll and amenity options (UNIT-27, AMEN-30) list the society's own. */
describe('report option pickers', () => {
  it('offers the society’s polls and sends the chosen one', () => {
    const onChange = vi.fn();
    const poll: CatalogueParam = { key: 'poll', label: 'Poll', type: 'poll', required: true };
    render(<ReportParamField param={poll} value="" onChange={onChange} today="2026-10-19" />);
    fireEvent.change(screen.getByLabelText('Poll'), { target: { value: 'p1' } });
    expect(onChange).toHaveBeenCalledWith('p1');
    expect(optionTexts('Poll')).toEqual(['Choose a poll', 'Repaint the gate?']);
  });

  it('starts an optional amenity on All amenities', () => {
    const amenity: CatalogueParam = { key: 'amenity', label: 'Amenity', type: 'amenity', required: false };
    render(<ReportParamField param={amenity} value="" onChange={vi.fn()} today="2026-10-19" />);
    expect((screen.getByLabelText('Amenity') as HTMLSelectElement).value).toBe('');
    expect(optionTexts('Amenity')).toEqual(['All amenities', 'Party Hall']);
  });
});
