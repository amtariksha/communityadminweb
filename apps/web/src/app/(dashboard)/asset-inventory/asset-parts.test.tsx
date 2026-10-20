import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Asset } from '@/hooks/use-assets';
import { assetFormValues, assetPayload } from '../assets/asset-form-fields';
import { AssetSearchSelect } from '../assets/asset-search-select';
import { AssetParts } from './assets/[id]/asset-parts';

/** Sub-components (ASSET-18): the Parent Asset field, its picker and the Parts list. */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T): T => value }));
const hits = vi.hoisted(() => ({
  data: [
    { id: 'lift', name: 'Lift A', location: 'Tower A', parent_asset_id: null },
    { id: 'motor', name: 'Motor 1', location: 'Tower A', parent_asset_id: 'lift' },
    { id: 'self', name: 'Panel', location: 'Lobby', parent_asset_id: null },
  ],
}));
vi.mock('@/hooks/use-assets', () => ({ useAssets: () => ({ isLoading: false, data: { data: hits.data, total: 3 } }) }));

describe('Parent Asset (ASSET-18)', () => {
  it('opens a part with its parent and sends the parent id; Remove sends null', () => {
    const values = assetFormValues({ id: 'motor', name: 'Motor 1', parent_asset_id: 'lift', parent_name: 'Lift A' } as Asset);
    expect(values.parent).toEqual({ id: 'lift', name: 'Lift A' });
    expect(assetPayload(values).parent_asset_id).toBe('lift');
    expect(assetPayload({ ...values, parent: null }).parent_asset_id).toBeNull();
  });

  it('offers neither the asset itself nor a part as a parent', () => {
    render(
      <AssetSearchSelect id="p" value={null} onChange={vi.fn()} exclude={(asset) => asset.id === 'self' || Boolean(asset.parent_asset_id)} />,
    );
    expect(screen.getByRole('button', { name: /Lift A/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Motor 1/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Panel/ })).toBeNull();
  });

  it('lists the parts on the asset page, each linking to its own page', () => {
    render(
      <AssetParts
        parts={[
          { id: 'm-1', name: 'Motor 1', asset_code: 'AST-0002', status: 'active', purchase_cost: '25000.00' },
          { id: 'm-2', name: 'Motor 2', asset_code: null, status: 'under_maintenance', purchase_cost: null },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Motor 1' }).getAttribute('href')).toBe('/asset-inventory/assets/m-1');
    expect(screen.getByText('Under Service')).toBeTruthy();
  });

  it('says how to add a part when there is none, and shows nothing for an older API', () => {
    const { container, rerender } = render(<AssetParts parts={[]} />);
    expect(screen.getByText(/choose this asset as its Parent Asset/)).toBeTruthy();
    rerender(<AssetParts />);
    expect(container.textContent).toBe('');
  });
});
