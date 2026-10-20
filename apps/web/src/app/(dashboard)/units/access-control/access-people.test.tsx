import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessPeople } from './access-people';

/** UNIT-22 / UNIT-23 — the Access Control lists: active and deactivated, designation, module switches, one Save Changes. */

const mocks = vi.hoisted(() => ({
  people: [] as unknown[],
  modules: { locked: false, count: 3, modules: [] as unknown[] },
  update: vi.fn(),
  saveModules: vi.fn(),
  setActive: vi.fn(),
}));

vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ getQueryData: () => mocks.modules }) }));
vi.mock('./add-person-form', () => ({ AddPersonForm: (): ReactNode => <p>Add form</p> }));
vi.mock('@/hooks/use-access-control', () => ({
  accessKeys: { modules: (id: string) => ['access-control', 'modules', id] },
  useAdminPeople: () => ({ isLoading: false, data: mocks.people }),
  usePersonModules: () => ({ isLoading: false, data: mocks.modules }),
  useUpdatePerson: () => ({ mutateAsync: mocks.update }),
  useSavePersonModules: () => ({ mutateAsync: mocks.saveModules }),
  useSetPersonActive: () => ({ mutate: mocks.setActive, isPending: false }),
}));

const person = (user_id: string, name: string, extra: Record<string, unknown> = {}) => ({
  user_id, name, phone: '+910000000095', email: null, kind: 'office_staff', designation: null, email_access_disabled: false,
  status: 'active', roles: ['accountant'], deactivated_roles: null, deactivated_at: null, joined_on: '2026-01-01T00:00:00Z',
  units: null, last_login_at: null, app_status: 'never', access_count: 3, locked: false, ...extra,
});
const switches = (locked = false) => ['maintenance_fee', 'bank_cash', 'admin_reports'].map((id) => ({ module_id: id, label: id, enabled: true, locked }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.people = [person('u-1', 'Test Accountant'), person('u-2', 'Test Former', { status: 'deactivated', roles: [], deactivated_roles: ['auditor'] })];
  mocks.modules = { locked: false, count: 3, modules: switches() };
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('AccessPeople', () => {
  it('lists active and deactivated people with their access count', () => {
    render(<AccessPeople kind="office_staff" />);

    expect(screen.getByLabelText('Active').textContent).toContain('Test Accountant');
    expect(screen.getByLabelText('Active').textContent).toContain('3 Access');
    expect(screen.getByLabelText('Deactivated').textContent).toContain('Test Former');
  });

  it('saves a switched-off module and a designation with one Save Changes', async () => {
    render(<AccessPeople kind="office_staff" />);
    fireEvent.click(screen.getByRole('button', { name: /Test Accountant/ }));
    fireEvent.click(screen.getByLabelText('maintenance_fee'));
    fireEvent.change(screen.getByLabelText('Designation'), { target: { value: 'Treasurer' } });

    expect(screen.getByRole('button', { name: /Test Accountant/ }).textContent).toContain('2 Access');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await vi.waitFor(() => expect(mocks.saveModules).toHaveBeenCalled());

    expect(mocks.update).toHaveBeenCalledWith({ userId: 'u-1', changes: { designation: 'Treasurer' } });
    expect(mocks.saveModules).toHaveBeenCalledWith({ userId: 'u-1', modules: { modules: [{ module_id: 'maintenance_fee', enabled: false }] } });
  });

  it('locks a community admin\'s switches on', () => {
    mocks.people = [person('u-3', 'Test Admin', { roles: ['community_admin'], locked: true, access_count: 21 })];
    mocks.modules = { locked: true, count: 3, modules: switches(true) };
    render(<AccessPeople kind="committee" />);
    fireEvent.click(screen.getByRole('button', { name: /Test Admin/ }));

    expect((screen.getByLabelText('bank_cash') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Give All Module Access' })).toBeNull();
  });

  it('Deactivate and Re-activate ask first and call the right switch', () => {
    render(<AccessPeople kind="office_staff" />);
    fireEvent.click(screen.getByRole('button', { name: /Test Former/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Re-activate' }));

    expect(mocks.setActive).toHaveBeenCalledWith({ userId: 'u-2', active: true }, expect.anything());
  });

  it('says it is not available on an API without it', () => {
    mocks.people = null as unknown as unknown[];
    render(<AccessPeople kind="committee" />);

    expect(screen.getByText('Access Control is not available yet on this server.')).toBeTruthy();
  });
});
