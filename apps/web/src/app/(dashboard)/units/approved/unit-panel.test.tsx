import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { UnitPanel } from './unit-panel';

/**
 * Approved Users › the unit panel (UNIT-12, screen UNIT-S5): every section
 * with its count from GET /units/:id/panel, "No data" for an empty one.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));

const panelQuery = vi.hoisted(() => ({ result: {} as Record<string, unknown> }));
vi.mock('@/hooks/use-unit-panel', () => ({
  useUnitPanel: () => panelQuery.result,
  unitPanelKeys: { panel: (id: string) => ['units', 'panel', id] },
}));
// UNIT-17 — the card and section actions' hooks and forms.
const mutation = vi.hoisted(() => ({ mutate: () => undefined, isPending: false }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: () => undefined }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: () => undefined }) }));
vi.mock('@/hooks/use-unit-members', () => ({ useUpdateMemberDetail: () => mutation, useDisconnectTenant: () => mutation }));
vi.mock('@/hooks/use-units', () => ({ useRemoveMember: () => mutation }));
vi.mock('@/hooks/use-unit-workers', () => ({ useRegisterUnitWorker: () => mutation, WORKER_CATEGORIES: ['maid'] }));
vi.mock('@/hooks', () => ({ useDocumentCategories: () => ({ data: [] }) }));
vi.mock('../../parking/components/vehicle-form', () => ({ VehicleForm: (): ReactNode => null }));
vi.mock('../../documents/upload-document-dialog', () => ({ UploadDocumentDialog: (): ReactNode => <button type="button">Upload Document</button> }));

const PANEL = {
  unit: { id: 'u-1', unit_number: '101', block: 'A' },
  members: [
    { id: 'm1', user_id: 'x', name: 'Test Owner', phone: '+910000000011', email: 'owner@example.test', member_type: 'owner', is_primary_contact: true, move_in_date: '2026-01-01' },
    { id: 'm2', user_id: null, name: 'Test Tenant', phone: null, email: null, member_type: 'tenant', is_primary_contact: false, move_in_date: '2026-03-01' },
  ],
  family: [],
  vehicles: [
    { id: 'v1', registration_number: 'KA01AB0001', vehicle_type: 'car', slot_number: 'P-1', sticker_number: 'S-9', status: 'active', member_name: 'Test Owner' },
    { id: 'v2', registration_number: 'KA01AB0002', vehicle_type: 'bike', slot_number: null, sticker_number: null, status: 'pending', member_name: 'Test Owner' },
  ],
  staff: [{ worker_id: 'w1', name: 'Test Helper', phone: '+910000000012', category: 'maid', since: '2026-02-01' }],
  documents: [{ id: 'd1', title: 'Sale deed', file_name: 'deed.pdf', mime_type: 'application/pdf', uploaded_by_name: 'Test Admin', created_at: '2026-04-01T10:00:00Z' }],
  counts: { members: 2, family: 0, vehicles: 2, staff: 1, documents: 1 },
};

const section = (title: string) => screen.getByText(new RegExp(`^${title} \\(\\d+\\)$`)).closest('details') as HTMLElement;

describe('UnitPanel', () => {
  beforeEach(() => {
    panelQuery.result = { isLoading: false, data: PANEL };
  });

  it('heads the panel with the unit and offers Show Logs and the unit details', () => {
    render(<UnitPanel unitId="u-1" />);

    expect(screen.getByRole('heading', { name: 'Unit: A-101' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show Logs' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View/Edit Unit details' }).getAttribute('href')).toBe('/units/approved/u-1/edit');
  });

  it('shows each section with its count, in order', () => {
    render(<UnitPanel unitId="u-1" />);

    const headings = Array.from(document.querySelectorAll('summary')).map((summary) => summary.textContent);
    expect(headings).toEqual(['Unit Members (2)', 'Vehicles (2)', 'Staff (1)', 'Documents (1)', 'Family Members (0)']);
  });

  it('shows the member cards with their tags and the rows of each table', () => {
    render(<UnitPanel unitId="u-1" />);

    const members = section('Unit Members');
    expect(within(members).getByText('Test Owner')).toBeTruthy();
    expect(within(members).getByText('Primary Contact')).toBeTruthy();
    expect(within(members).getByText('Tenant')).toBeTruthy();
    const vehicles = within(section('Vehicles')).getAllByRole('row');
    expect(vehicles).toHaveLength(3);
    expect(vehicles[2].textContent).toContain('Pending approval');
    expect(within(section('Staff')).getByText('Maid')).toBeTruthy();
    expect(within(section('Documents')).getByText('PDF')).toBeTruthy();
  });

  it('says "No data" in a section with no rows', () => {
    render(<UnitPanel unitId="u-1" />);

    expect(within(section('Family Members')).getByText('No data')).toBeTruthy();
    expect(within(section('Vehicles')).queryByText('No data')).toBeNull();
  });

  it('says the unit was not found, with a link back, for an unknown unit', () => {
    panelQuery.result = { isLoading: false, isError: true, error: new ApiError(404, { message: 'Unit not found', code: 'unit_not_found' } as never) };
    render(<UnitPanel unitId="u-9" />);

    expect(screen.getByText('Unit not found.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Approved Users' }).getAttribute('href')).toBe('/units/approved');
  });

  it('says the panel is not available on an API without it', () => {
    panelQuery.result = { isLoading: false, isError: true, error: new ApiError(404, { message: 'Cannot GET' } as never) };
    render(<UnitPanel unitId="u-1" />);

    expect(screen.getByText('The unit panel is not available yet on this server.')).toBeTruthy();
  });
});
