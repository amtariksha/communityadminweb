import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { primaryStatusAction, statusActions } from '@/lib/asset-statuses';
import { AssetStatusList } from './assets/asset-status-list';

/**
 * Assets by status (ASSET-07): the route decides the status, the heading
 * carries the Total Asset Value, and each row has Edit, its status action
 * and QR (ASSET-08).
 */

const nav = vi.hoisted(() => ({ pathname: '/asset-inventory/assets/active' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T): T => value }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
const role = vi.hoisted(() => ({ value: 'committee_member' }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => role.value }));

const mocks = vi.hoisted(() => ({ register: vi.fn(), update: vi.fn() }));
vi.mock('@/hooks/use-asset-register', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-asset-register')>()),
  useAssetRegister: (filters: unknown) => mocks.register(filters),
}));
vi.mock('@/hooks/use-assets', () => ({ useUpdateAsset: () => ({ mutate: mocks.update, isPending: false }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const PUMP = {
  id: 'a-1',
  name: 'Borewell pump',
  asset_type: 'equipment',
  location: 'Pump room',
  purchase_cost: 10000,
  purchase_date: '2025-04-01',
  warranty_expiry: '',
  condition: 'good',
  status: 'active',
};

describe('AssetStatusList', () => {
  beforeEach(() => {
    nav.pathname = '/asset-inventory/assets/active';
    role.value = 'committee_member';
    mocks.update.mockClear();
    mocks.register.mockReset().mockReturnValue({ isLoading: false, data: { data: [PUMP], total: 3, total_value: '17500.00' } });
  });

  it('shows Active Assets with the total value of every active asset', () => {
    render(<AssetStatusList />);

    expect(screen.getByRole('heading', { name: 'Active Assets — Total Asset Value: ₹17,500' })).toBeTruthy();
    expect(mocks.register).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'active', page: 1 }));
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/asset-inventory/assets/a-1');
  });

  it('asks the server for one category', () => {
    render(<AssetStatusList />);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'elevator' } });

    expect(mocks.register).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'elevator', page: 1 }));
  });

  it('Send to Service asks first, then moves the asset under service', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AssetStatusList />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Service' }));

    expect(mocks.update).toHaveBeenCalledWith({ id: 'a-1', status: 'under_maintenance' }, expect.anything());
  });

  it('reads Under Service from its route and offers Back in Service', () => {
    nav.pathname = '/asset-inventory/assets/under-service';
    render(<AssetStatusList />);

    expect(mocks.register).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'under_maintenance' }));
    expect(screen.getByRole('button', { name: 'Back in Service' })).toBeTruthy();
  });

  it('offers Re-activate on expired assets to the community admin only', () => {
    nav.pathname = '/asset-inventory/assets/expired';
    render(<AssetStatusList />);
    expect(screen.queryByRole('button', { name: 'Re-activate' })).toBeNull();
  });
});

describe('asset status moves (ASSET-08)', () => {
  it('lists the moves each status allows', () => {
    expect(statusActions('active').map((action) => action.label)).toEqual(['Send to Service', 'Mark Expired']);
    expect(statusActions('under_maintenance').map((action) => action.to)).toEqual(['active', 'decommissioned']);
    expect(statusActions('decommissioned')).toEqual([primaryStatusAction('decommissioned')]);
    expect(primaryStatusAction('decommissioned').adminOnly).toBe(true);
  });
});
