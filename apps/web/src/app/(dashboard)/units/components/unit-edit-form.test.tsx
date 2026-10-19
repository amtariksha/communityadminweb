import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UnitEditForm } from './unit-edit-form';
import type { UnitRecord } from './unit-edit-values';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

/** UNIT-16 — the unit form shows every field the API holds and sends only what changed. */

const UNIT: UnitRecord = {
  id: 'u-1',
  unit_number: '201',
  block: 'B',
  floor: 2,
  area_sqft: '1200.00',
  unit_type: 'residential',
  is_active: true,
  apartment_number: null,
  bhk_type: '2BHK',
  garden_area: null,
  occupancy_status: 'self_occupied',
  intercom: '201',
  meter_number: 'M-77',
  meter_in_owner_name: true,
  khata_in_owner_name: null,
  previous_owner: null,
  transfer_amount_received: false,
  parking_slot: 'P-4',
  member_category_id: null,
  billing_category_id: null,
};

function renderForm(onSave = vi.fn()) {
  render(<UnitEditForm unit={UNIT} categories={[]} billingTypes={null} blocks={['A', 'B']} onSave={onSave} />);
  return onSave;
}

describe('UnitEditForm', () => {
  it('shows every unit field, with the stored values', () => {
    renderForm();

    for (const label of [
      'Unit Number *', 'Block *', 'Floor *', 'Area (sq ft) *', 'Unit Type *', 'Apartment Number', 'BHK Type', 'Occupancy',
      'Intercom', 'Meter Number', "Meter in owner's name", "Khata in owner's name", 'Previous Owner', 'Transfer amount received',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect((screen.getByLabelText('Intercom') as HTMLInputElement).value).toBe('201');
    expect((screen.getByLabelText("Meter in owner's name") as HTMLSelectElement).value).toBe('yes');
    expect(screen.getByText(/Parking slot: P-4/)).toBeTruthy();
  });

  it('shows no maintenance amount or rate', () => {
    renderForm();

    expect(screen.queryByText(/maintenance/i)).toBeNull();
    expect(screen.queryByText(/rate/i)).toBeNull();
  });

  it('sends only the changed fields', () => {
    const onSave = renderForm();

    fireEvent.change(screen.getByLabelText('Intercom'), { target: { value: '202' } });
    fireEvent.change(screen.getByLabelText("Khata in owner's name"), { target: { value: 'no' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledWith({ intercom: '202', khata_in_owner_name: false });
  });

  it('refuses a floor out of range without saving', () => {
    const onSave = renderForm();

    fireEvent.change(screen.getByLabelText('Floor *'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Floor is a whole number/)).toBeTruthy();
  });
});
