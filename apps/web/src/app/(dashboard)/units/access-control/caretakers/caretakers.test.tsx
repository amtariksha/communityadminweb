import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { caretakerFormError } from './add-caretaker-form';
import { Caretakers } from './caretakers';

/** UNIT-30 — Access Control › Care Taker / Unit Manager: active and deactivated lists, Deactivate, the add form's rules. */

const mocks = vi.hoisted(() => ({ data: [] as unknown[] | null, setActive: vi.fn() }));

vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('./add-caretaker-form', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./add-caretaker-form')>()),
  AddCaretakerForm: (): ReactNode => <p>Add caretaker form</p>,
}));
vi.mock('@/hooks/use-unit-managers', () => ({
  useUnitManagers: () => ({ isLoading: false, data: mocks.data }),
  useSetUnitManagerActive: () => ({ mutate: mocks.setActive, isPending: false }),
}));

const manager = (user_id: string, name: string, status: 'active' | 'deactivated', units: Array<{ label: string; valid_until: string | null }>) => ({
  user_id, name, phone: '+910000000092', status, since: '2026-10-01T00:00:00Z', deactivated_at: null, last_login_at: null, app_status: 'never',
  units: units.map((unit, index) => ({ unit_id: `${user_id}-${index}`, ...unit })),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.data = [
    manager('u-1', 'Test Caretaker', 'active', [{ label: 'B-101', valid_until: null }, { label: 'B-102', valid_until: '2026-12-31' }]),
    manager('u-2', 'Test Former', 'deactivated', [{ label: 'C-201', valid_until: null }]),
  ];
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('Care Taker / Unit Manager', () => {
  it('lists active and deactivated logins with the units each manages', () => {
    render(<Caretakers />);

    const active = screen.getByLabelText('Active').textContent ?? '';
    expect(active).toContain('Test Caretaker');
    expect(active).toContain('B-101');
    expect(active).toContain('B-102 (until');
    expect(screen.getByLabelText('Deactivated').textContent).toContain('Test Former');
  });

  it('deactivates after a confirm, and re-activates a deactivated one', () => {
    render(<Caretakers />);
    const [deactivate] = screen.getAllByRole('button', { name: 'Deactivate' });
    fireEvent.click(deactivate);
    expect(mocks.setActive).toHaveBeenCalledWith({ userId: 'u-1', active: false }, expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Re-activate' }));
    expect(mocks.setActive).toHaveBeenCalledWith({ userId: 'u-2', active: true }, expect.anything());
  });

  it('filters by unit', () => {
    render(<Caretakers />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'c-201' } });
    expect(screen.getByLabelText('Active').textContent).not.toContain('Test Caretaker');
  });

  it('says so on a server without the route', () => {
    mocks.data = null;
    render(<Caretakers />);
    expect(screen.getByText(/not available yet/)).toBeTruthy();
  });
});

describe('the add form rules', () => {
  const base = { phone: '+910000000093', name: 'Test Person', units: [{ id: 'u1', label: 'B-101' }], validUntil: '', today: '2026-10-20' };

  it('accepts a phone, a name and 1–20 units', () => {
    expect(caretakerFormError(base)).toBeNull();
  });

  it.each([
    [{ phone: '' }, 'Enter an Indian mobile number.'],
    [{ name: ' ' }, 'Enter the name.'],
    [{ units: [] }, 'Choose at least one unit.'],
    [{ units: Array.from({ length: 21 }, (_, i) => ({ id: `u${i}`, label: `B-${i}` })) }, 'At most 20 units.'],
    [{ validUntil: '2026-10-20' }, 'Valid until must be after today.'],
  ])('refuses %o', (patch, message) => {
    expect(caretakerFormError({ ...base, ...patch })).toBe(message);
  });
});
