import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssetsContent from './assets-content';

// Each case renders a large screen (well under a second alone); under the full
// parallel run the default 5 s ran out, so this file allows 30 s a case.
vi.setConfig({ testTimeout: 30_000 });

/**
 * The Assets page and `/assets` API had drifted apart field by field.
 * Each test below pins one name the API really uses — see
 * communityos `apps/api/src/modules/asset/asset.controller.ts` and its
 * `asset-admin-web-contract.e2e.spec.ts`.
 */

const mocks = vi.hoisted(() => {
  const mutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  });
  const query = (data: unknown) => () => ({ data, isLoading: false });
  return {
    // Ravi is one person with two ids: his society_staff row and his login.
    STAFF_ROW_ID: 'staff-row-1',
    RAVI_USER_ID: 'user-77',
    addToast: vi.fn(),
    createAsset: mutation(),
    createAMC: mutation(),
    logService: mutation(),
    createSchedule: mutation(),
    other: mutation(),
    updateAMC: mutation(),
    useAssets: vi.fn(),
    query,
  };
});

const DG_SET = vi.hoisted(() => ({
  id: 'asset-1',
  name: 'DG Set',
  asset_type: 'generator',
  location: 'Basement',
  manufacturer: 'Pumpline',
  model: '',
  serial_number: '',
  purchase_date: '',
  purchase_cost: 0,
  warranty_expiry: '',
  condition: 'good',
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
}));

vi.mock('@/hooks/use-asset-categories', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-asset-categories')>()),
  // An API without categories (ASSET-16): the fixed types are offered.
  useAssetCategories: () => ({ data: undefined }),
}));
vi.mock('@/hooks/use-assets', () => ({
  useAssetDashboard: mocks.query({
    total_assets: 4,
    active_assets: 3,
    under_maintenance: 1,
    decommissioned: 0,
    active_amcs: 2,
    expiring_amcs_30d: 1,
    overdue_services: 3,
  }),
  useAssets: (filters?: Record<string, unknown>) => mocks.useAssets(filters),
  useAMCs: mocks.query({
    data: [
      {
        id: 'amc-1',
        asset_id: 'asset-1',
        asset_name: 'DG Set',
        vendor_name: 'Pumpline Service Co.',
        contract_number: 'AMC-1',
        start_date: '2026-01-01T12:00:00.000Z',
        end_date: '2099-01-01T12:00:00.000Z',
        // pg returns NUMERIC as a string
        cost: '12000.00',
        status: 'active',
        reminder_days: 30,
      },
    ],
    total: 1,
  }),
  useServiceLogs: mocks.query([
    {
      id: 'svc-1',
      asset_id: 'asset-1',
      asset_name: 'DG Set',
      service_type: 'maintenance',
      service_date: '2026-09-01T12:00:00.000Z',
      vendor_name: null,
      description: 'Oil change',
      cost: null,
      next_service_date: '2026-12-15T12:00:00.000Z',
    },
  ]),
  useAssetChecklists: mocks.query([
    { id: 'cl-1', name: 'Fire Safety', area: 'Tower A', items: 5, frequency: 'Monthly', last_run: null },
    { id: 'cl-2', name: 'Lift Inspection', area: 'Lifts', items: 8, frequency: 'monthly', last_run: '2026-10-01', next_due: '2026-11-01' },
  ]),
  useAuditSchedules: mocks.query([]),
  useConductedAudits: mocks.query([]),
  useVendorAudits: mocks.query([]),
  useCreateAsset: () => mocks.createAsset,
  useCreateAMC: () => mocks.createAMC,
  useLogService: () => mocks.logService,
  useCreateAuditSchedule: () => mocks.createSchedule,
  useUpdateAsset: () => mocks.other,
  useUpdateAMC: () => mocks.updateAMC,
  useCreateChecklist: () => mocks.other,
  useRecordConductedAudit: () => mocks.other,
  useCreateVendorAudit: () => mocks.other,
}));

vi.mock('@/hooks', () => ({
  useVendors: mocks.query({ data: [{ id: 'vendor-1', name: 'Pumpline Service Co.' }] }),
  useStaffEmployees: mocks.query({
    data: [{ id: mocks.STAFF_ROW_ID, name: 'Ravi Kumar', staff_type: 'electrician' }],
  }),
}));

vi.mock('@/hooks/use-user-search', () => ({
  useUserSearch: (q: string) => ({
    data:
      q.trim().length >= 3
        ? [{ id: mocks.RAVI_USER_ID, phone: '+919900000001', name: 'Ravi Kumar', email: null, units: [], roles: ['security_guard'] }]
        : [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-debounced-value', () => ({
  useDebouncedValue: <T,>(value: T): T => value,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mocks.addToast }),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

function setField(label: RegExp, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function openTab(name: string): void {
  fireEvent.click(screen.getByRole('button', { name }));
}

function dialogTitled(title: string): HTMLElement {
  return screen.getByRole('heading', { name: title }).closest('dialog') as HTMLElement;
}

/** 30 assets on the server, 25 a page; "pump" matches two. */
function serverAssets(filters?: Record<string, unknown>) {
  const all = Array.from({ length: 30 }, (_, i) => ({
    ...DG_SET,
    id: `asset-${i + 1}`,
    name: i === 0 ? 'DG Set' : i < 3 ? `Pump ${i}` : `Asset ${i + 1}`,
  }));
  const search = String(filters?.search ?? '').toLowerCase();
  const hits = search ? all.filter((a) => a.name.toLowerCase().includes(search)) : all;
  const page = Number(filters?.page ?? 1);
  const limit = Number(filters?.limit ?? 25);
  return { data: { data: hits.slice((page - 1) * limit, page * limit), total: hits.length }, isLoading: false };
}

describe('AssetsContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAssets.mockImplementation(serverAssets);
  });

  describe('asset list (ASSET-02)', () => {
    it('shows 25 of 30 and the other 5 on page 2', () => {
      render(<AssetsContent />);
      expect(screen.getByText('Showing 1 to 25 of 30 entries')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: '2' }));

      expect(screen.getByText('Showing 26 to 30 of 30 entries')).toBeTruthy();
      expect(mocks.useAssets).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 25 }));
    });

    it('searches on the server', () => {
      render(<AssetsContent />);
      fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'pump' } });

      expect(mocks.useAssets).toHaveBeenCalledWith(expect.objectContaining({ search: 'pump', page: 1 }));
      expect(screen.getByText('Showing 1 to 2 of 2 entries')).toBeTruthy();
    });
  });

  it('shows AMCs expiring in 30 days on the "Expiring Soon" tile', () => {
    render(<AssetsContent />);

    const tile = screen.getByText('Expiring Soon').parentElement as HTMLElement;
    expect(within(tile).getByText('1')).toBeTruthy();
  });

  describe('asset condition', () => {
    it('offers "non_functional", which the API accepts, and not "critical"', () => {
      render(<AssetsContent />);
      fireEvent.click(screen.getByRole('button', { name: /add asset/i }));

      const select = screen.getByLabelText('Condition') as HTMLSelectElement;
      const values = Array.from(select.options).map((o) => o.value);

      expect(values).toEqual(['excellent', 'good', 'fair', 'poor', 'non_functional']);
    });
  });

  describe('AMC contracts', () => {
    it('shows the contract cost the API returns', () => {
      render(<AssetsContent />);
      openTab('AMC Contracts');

      const row = screen.getByText('AMC-1').closest('tr') as HTMLElement;
      expect(within(row).getByText('₹12,000')).toBeTruthy();
    });

    it('posts vendor_name and cost, the fields the API stores', () => {
      render(<AssetsContent />);
      openTab('AMC Contracts');
      fireEvent.click(screen.getByRole('button', { name: /add amc/i }));
      const dialog = dialogTitled('Create AMC Contract');

      // The asset picker searches the server (no 100-asset preload).
      setField(/^asset/i, 'DG');
      fireEvent.click(within(dialog).getByRole('button', { name: /^DG Set/ }));
      setField(/^vendor/i, 'vendor-1');
      setField(/contract number/i, 'AMC-9');
      setField(/start date/i, '2026-11-01');
      setField(/end date/i, '2027-10-31');
      setField(/amount/i, '18000');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

      expect(mocks.createAMC.mutate).toHaveBeenCalledTimes(1);
      expect(mocks.createAMC.mutate.mock.calls[0][0]).toEqual({
        asset_id: 'asset-1',
        vendor_name: 'Pumpline Service Co.',
        contract_number: 'AMC-9',
        start_date: '2026-11-01',
        end_date: '2027-10-31',
        cost: 18000,
      });
    });

    it('edits the end date and reminder days of a contract (VEND-04)', () => {
      render(<AssetsContent />);
      openTab('AMC Contracts');
      const row = screen.getByText('AMC-1').closest('tr') as HTMLElement;
      expect(within(row).getByText('30 days before')).toBeTruthy();
      fireEvent.click(within(row).getByTitle('Edit contract'));
      const dialog = dialogTitled('Edit AMC Contract');

      setField(/end date/i, '2099-03-31');
      setField(/reminder days/i, '45');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      expect(mocks.updateAMC.mutate).toHaveBeenCalledTimes(1);
      expect(mocks.updateAMC.mutate.mock.calls[0][0]).toEqual({ id: 'amc-1', end_date: '2099-03-31', reminder_days: 45 });
    });

    it('has no Frequency field, because nothing stores it', () => {
      render(<AssetsContent />);
      openTab('AMC Contracts');
      fireEvent.click(screen.getByRole('button', { name: /add amc/i }));

      expect(screen.queryByLabelText(/frequency/i)).toBeNull();
    });
  });

  describe('service history', () => {
    it('shows the next service date the API returns', () => {
      render(<AssetsContent />);
      openTab('Service History');

      const row = screen.getByText('DG Set').closest('tr') as HTMLElement;
      expect(within(row).getByText('15 Dec 2026')).toBeTruthy();
    });

    it('posts next_service_date and requires a description', () => {
      render(<AssetsContent />);
      openTab('Service History');
      fireEvent.click(screen.getByRole('button', { name: /log service/i }));
      const dialog = dialogTitled('Log Service');

      expect((screen.getByLabelText(/description/i) as HTMLInputElement).required).toBe(true);

      // The asset picker searches the server (no 100-asset preload).
      setField(/^asset/i, 'DG');
      fireEvent.click(within(dialog).getByRole('button', { name: /^DG Set/ }));
      setField(/service date/i, '2026-10-10');
      setField(/description/i, 'Oil and filter change');
      setField(/next service due/i, '2027-01-10');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Log Service' }));

      expect(mocks.logService.mutate).toHaveBeenCalledTimes(1);
      expect(mocks.logService.mutate.mock.calls[0][0]).toEqual({
        asset_id: 'asset-1',
        service_type: 'maintenance',
        service_date: '2026-10-10',
        vendor_name: undefined,
        description: 'Oil and filter change',
        cost: undefined,
        next_service_date: '2027-01-10',
      });
    });
  });

  describe('Schedule Inspection Audit', () => {
    function openScheduleDialog(): HTMLElement {
      render(<AssetsContent />);
      openTab('Audit Schedules');
      fireEvent.click(screen.getByRole('button', { name: /schedule audit/i }));
      return dialogTitled('Schedule Inspection Audit');
    }

    it('assigns the round to a users.id picked from the society directory', async () => {
      const dialog = openScheduleDialog();

      setField(/checklist/i, 'cl-1');
      setField(/scheduled date/i, '2026-11-01');
      fireEvent.change(within(dialog).getByPlaceholderText(/search by phone or name/i), {
        target: { value: 'Ravi' },
      });
      // The matched part of the name is highlighted, so match the whole row.
      fireEvent.mouseDown(await screen.findByRole('button', { name: /Ravi Kumar/ }));
      fireEvent.click(within(dialog).getByRole('button', { name: /schedule/i }));

      await waitFor(() => expect(mocks.createSchedule.mutateAsync).toHaveBeenCalledTimes(1));
      expect(mocks.createSchedule.mutateAsync).toHaveBeenCalledWith({
        checklist_id: 'cl-1',
        checklist: 'Fire Safety',
        scheduled_date: '2026-11-01',
        assigned_to: 'Ravi Kumar',
        assigned_to_user_id: mocks.RAVI_USER_ID,
      });
    });

    it('asks for an assignee instead of scheduling without one', async () => {
      const dialog = openScheduleDialog();

      setField(/checklist/i, 'cl-1');
      setField(/scheduled date/i, '2026-11-01');
      fireEvent.click(within(dialog).getByRole('button', { name: /schedule/i }));

      await waitFor(() =>
        expect(mocks.addToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' }),
        ),
      );
      expect(mocks.createSchedule.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('master checklists (ASSET-06)', () => {
    it('shows the frequency, Last Run and Next Due', () => {
      render(<AssetsContent />);
      openTab('Master Checklists');

      const row = screen.getByText('Lift Inspection').closest('tr') as HTMLElement;
      expect(within(row).getByText('Monthly')).toBeTruthy();
      expect(within(row).getByText('01 Oct 2026')).toBeTruthy();
      expect(within(row).getByText('01 Nov 2026')).toBeTruthy();
      const never = screen.getByText('Fire Safety').closest('tr') as HTMLElement;
      expect(within(never).getByText('Never')).toBeTruthy();
    });

    it('offers only the frequencies the API accepts', () => {
      render(<AssetsContent />);
      openTab('Master Checklists');
      fireEvent.click(screen.getByRole('button', { name: /add checklist/i }));

      const select = screen.getByLabelText('Frequency') as HTMLSelectElement;
      expect(Array.from(select.options).map((o) => o.value)).toEqual(['weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly']);
    });
  });
});
