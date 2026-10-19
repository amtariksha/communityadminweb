import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmergencyContact } from '@/hooks';
import { EmergencyGrid } from './emergency-grid';

/**
 * Setup Emergency Numbers (PROF-10, screen PROF-S6): the saved numbers
 * and seven blank rows, one Save storing edits, new rows and removals.
 */

const mocks = vi.hoisted(() => ({ save: vi.fn(), addToast: vi.fn() }));
vi.mock('@/hooks/use-emergency-grid', () => ({
  useSaveEmergencyContacts: () => ({ mutateAsync: mocks.save, isPending: false }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

const contact = (id: string, name: string, phone: string, category: EmergencyContact['category']): EmergencyContact => ({
  id,
  tenant_id: 't-1',
  name,
  phone,
  category,
  address: null,
  available_24_7: true,
  created_at: '2026-10-01',
  updated_at: '2026-10-01',
});

const CONTACTS = [contact('c-1', 'City Hospital', '080 2222 3333', 'hospital'), contact('c-2', 'Police Station', '100', 'police')];

describe('EmergencyGrid', () => {
  beforeEach(() => {
    mocks.save.mockReset().mockResolvedValue([]);
  });

  it('offers the saved numbers and seven blank rows', () => {
    render(<EmergencyGrid contacts={CONTACTS} readOnly={false} />);

    expect(screen.getAllByRole('textbox', { name: /Name \/ Agency/ })).toHaveLength(9);
  });

  it('saves two edits and one new row in one request', async () => {
    render(<EmergencyGrid contacts={CONTACTS} readOnly={false} />);
    const names = screen.getAllByRole('textbox', { name: /Name \/ Agency/ });
    const phones = screen.getAllByRole('textbox', { name: /Mobile No\./ });

    fireEvent.change(names[0], { target: { value: 'City Hospital Emergency' } });
    fireEvent.change(phones[1], { target: { value: '112' } });
    fireEvent.change(names[2], { target: { value: 'Ambulance' } });
    fireEvent.change(phones[2], { target: { value: '108' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][0]).toEqual([
      { id: 'c-1', name: 'City Hospital Emergency', phone: '080 2222 3333', category: 'hospital', available_24_7: true },
      { id: 'c-2', name: 'Police Station', phone: '112', category: 'police', available_24_7: true },
      { name: 'Ambulance', phone: '108', category: 'internal', available_24_7: true },
    ]);
  });

  it('refuses a row whose number is not 3 to 15 digits', async () => {
    render(<EmergencyGrid contacts={CONTACTS} readOnly={false} />);
    fireEvent.change(screen.getAllByRole('textbox', { name: /Mobile No\./ })[0], { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(await screen.findByText('Enter a number of 3 to 15 digits (100, 108 are fine).')).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('sends a removed number marked for removal', async () => {
    render(<EmergencyGrid contacts={CONTACTS} readOnly={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove row 2' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0][0][1]).toMatchObject({ id: 'c-2', remove: true });
  });
});
