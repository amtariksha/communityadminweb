import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnitPanel } from './unit-panel';

/**
 * UNIT-17 — the classic unit panel's card and section actions: each button
 * calls its route with this unit, and the panel is read again after it.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));

const mocks = vi.hoisted(() => ({
  panel: {} as Record<string, unknown>,
  update: vi.fn(),
  remove: vi.fn(),
  disconnect: vi.fn(),
  register: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock('@/hooks/use-unit-panel', () => ({
  useUnitPanel: () => ({ isLoading: false, data: mocks.panel }),
  unitPanelKeys: { panel: (id: string) => ['units', 'panel', id] },
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: () => undefined }) }));
vi.mock('@/hooks/use-unit-members', () => ({
  useUpdateMemberDetail: () => ({ mutate: mocks.update, isPending: false }),
  useDisconnectTenant: () => ({ mutate: mocks.disconnect }),
}));
vi.mock('@/hooks/use-units', () => ({ useRemoveMember: () => ({ mutate: mocks.remove }) }));
vi.mock('@/hooks/use-unit-workers', () => ({
  useRegisterUnitWorker: () => ({ mutate: mocks.register, isPending: false }),
  WORKER_CATEGORIES: ['maid', 'cook'],
}));
vi.mock('@/hooks', () => ({ useDocumentCategories: () => ({ data: [] }) }));
vi.mock('../../parking/components/vehicle-form', () => ({
  VehicleForm: ({ unitId }: { unitId: string }): ReactNode => <p>Add Vehicle form for {unitId}</p>,
}));
vi.mock('../../documents/upload-document-dialog', () => ({
  UploadDocumentDialog: ({ units }: { units: Array<{ id: string }> }): ReactNode => <button type="button">Upload for {units.map((u) => u.id).join(',')}</button>,
}));

const member = (id: string, member_type: string, name: string, primary = false) => ({
  id, user_id: `user-${id}`, name, phone: '+910000000041', email: null, member_type, is_primary_contact: primary,
  move_in_date: '2026-01-01', lives_here: true, is_association_member: false, alternate_address: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.panel = {
    unit: { id: 'u-7', unit_number: '701', block: 'G' },
    members: [member('m1', 'owner', 'Test Owner', true), member('m2', 'tenant', 'Test Tenant')],
    family: [], vehicles: [], staff: [], documents: [],
    counts: { members: 2, family: 0, vehicles: 0, staff: 0, documents: 0 },
  };
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

const card = (name: string) => screen.getByText(name).closest('li') as HTMLElement;

describe('unit panel actions', () => {
  it('Make Primary Contact sends the tick for that member of this unit, and is hidden on the primary one', () => {
    render(<UnitPanel unitId="u-7" />);

    expect(within(card('Test Owner')).queryByRole('button', { name: 'Make Primary Contact' })).toBeNull();
    fireEvent.click(within(card('Test Tenant')).getByRole('button', { name: 'Make Primary Contact' }));

    expect(mocks.update).toHaveBeenCalledWith({ unitId: 'u-7', memberId: 'm2', is_primary_contact: true }, expect.anything());
  });

  it('Move Out asks first, then moves that member out of this unit', () => {
    render(<UnitPanel unitId="u-7" />);

    fireEvent.click(within(card('Test Tenant')).getByRole('button', { name: 'Move Out' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith({ unitId: 'u-7', memberId: 'm2' }, expect.anything());
  });

  it('Disconnect Tenant is on the tenant card only and disconnects this unit', () => {
    render(<UnitPanel unitId="u-7" />);

    expect(within(card('Test Owner')).queryByRole('button', { name: 'Disconnect Tenant' })).toBeNull();
    fireEvent.click(within(card('Test Tenant')).getByRole('button', { name: 'Disconnect Tenant' }));

    expect(mocks.disconnect).toHaveBeenCalledWith({ unitId: 'u-7' }, expect.anything());
    expect(within(card('Test Owner')).getByRole('link', { name: 'Transfer Ownership' }).getAttribute('href')).toBe('/units?unit=u-7');
  });

  it('Edit opens the member form as a page and saves only the change', () => {
    render(<UnitPanel unitId="u-7" />);

    fireEvent.click(within(card('Test Tenant')).getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByLabelText('Association Member'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.update).toHaveBeenCalledWith({ unitId: 'u-7', memberId: 'm2', is_association_member: true }, expect.anything());
  });

  it('+ Add Vehicle opens the vehicle form for this unit, Upload is limited to it', () => {
    render(<UnitPanel unitId="u-7" />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add Vehicle' }));

    expect(screen.getByText('Add Vehicle form for u-7')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload for u-7' })).toBeTruthy();
  });

  it('+ Create New Staff registers the helper for this unit', () => {
    render(<UnitPanel unitId="u-7" />);

    fireEvent.click(within(screen.getByLabelText('Staff')).getByRole('button', { name: '+ Create New Staff' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Helper' } });
    fireEvent.change(screen.getByLabelText('Phone/Mobile'), { target: { value: '+910000000061' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mocks.register).toHaveBeenCalledWith({ unit_id: 'u-7', name: 'Test Helper', phone: '+910000000061', category: 'maid' }, expect.anything());
  });
});
