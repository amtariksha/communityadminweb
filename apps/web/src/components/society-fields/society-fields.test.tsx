import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FormField } from '@/hooks/use-resident-fields';
import { SocietyFields, editableValues, fieldErrorsFrom } from './society-fields';
import { FormFieldsInput, appliesFor, filledValues } from './form-fields-input';

/** MOVE-15 — the society's fields as inputs, by type, on the record and the create forms. */

const mocks = vi.hoisted(() => ({ form: null as unknown }));
vi.mock('@/hooks/use-resident-fields', () => ({ useFormFields: () => ({ data: mocks.form }) }));

const field = (overrides: Partial<FormField>): FormField => ({ id: `f-${overrides.key}`, key: 'x', label: 'X', type: 'text', choices: null, read_only: false, ...overrides });

const FIELDS = [
  field({ key: 'profession', label: 'Profession' }),
  field({ key: 'date_of_birth', label: 'Date of Birth', type: 'date' }),
  field({ key: 'ownership_status', label: 'Ownership Status', type: 'single', choices: ['Sole Owner', 'Co-Owner'] }),
  field({ key: 'pets', label: 'Pets', type: 'multiple', choices: ['Dog', 'Cat'] }),
  field({ key: 'rental_agreement_status', label: 'Rental Agreement Status', type: 'single', choices: ['Active'], read_only: true }),
];

describe('SocietyFields', () => {
  it('renders an input per type and shows a derived field as text', () => {
    const onChange = vi.fn();
    render(<SocietyFields fields={FIELDS} values={{ pets: ['Dog'], rental_agreement_status: 'Ended' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Profession'), { target: { value: 'Teacher' } });
    expect(onChange).toHaveBeenLastCalledWith('profession', 'Teacher');
    expect((screen.getByLabelText('Date of Birth') as HTMLInputElement).type).toBe('date');
    fireEvent.change(screen.getByLabelText('Ownership Status'), { target: { value: 'Co-Owner' } });
    expect(onChange).toHaveBeenLastCalledWith('ownership_status', 'Co-Owner');
    fireEvent.click(screen.getByLabelText('Cat'));
    expect(onChange).toHaveBeenLastCalledWith('pets', ['Dog', 'Cat']);
    expect(screen.getByText('Ended')).toBeTruthy();
  });

  it('is read-only when asked, and says when nothing is switched on', () => {
    const { unmount } = render(<SocietyFields fields={FIELDS} values={{}} readOnly />);
    expect((screen.getByLabelText('Profession') as HTMLInputElement).disabled).toBe(true);
    unmount();
    render(<SocietyFields fields={[]} values={{}} />);
    expect(screen.getByText('No society fields are switched on.')).toBeTruthy();
  });

  it('sends typed values only, and reads the API’s per-field errors', () => {
    expect(editableValues(FIELDS, { profession: 'Teacher', rental_agreement_status: 'Ended' })).toEqual({
      profession: 'Teacher', date_of_birth: null, ownership_status: null, pets: null,
    });
    expect(filledValues({ a: 'x', b: null, c: '', d: [] })).toEqual({ a: 'x' });
    expect(fieldErrorsFrom({ 'values.profession': 'Too long', other: 'x' })).toEqual({ profession: 'Too long' });
  });
});

describe('FormFieldsInput', () => {
  it('shows the enabled fields of the form, and nothing on an older API', () => {
    mocks.form = [{ ...FIELDS[0], phase: 'in', position: 0, is_enabled: true, applies_to: 'owner', binding: null, is_predefined: true }];
    const { unmount } = render(<FormFieldsInput phase="in" applies="owner" values={{}} onChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Society fields' })).toBeTruthy();
    unmount();
    mocks.form = null;
    const { container } = render(<FormFieldsInput phase="in" applies="owner" values={{}} onChange={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('owners and their family fill the owner fields; tenants and theirs the tenant ones', () => {
    expect([appliesFor('owner'), appliesFor('owner_family'), appliesFor('tenant'), appliesFor('tenant_family')]).toEqual(['owner', 'owner', 'tenant', 'tenant']);
  });
});
