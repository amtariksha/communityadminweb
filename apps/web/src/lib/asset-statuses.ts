import type { StatusRoute } from '@/components/layout/menu/status-menu';
import type { AssetStatus } from '@/hooks/use-asset-register';

/** Assets › Active / Under Service / Expired (SB-05, ASSET-07): each a route. */
export interface AssetStatusRoute extends StatusRoute {
  status: AssetStatus;
  emptyText: string;
}

export const ASSETS_BASE = '/asset-inventory/assets';

export const ASSET_STATUS_ROUTES: readonly AssetStatusRoute[] = [
  { slug: 'active', label: 'Active Assets', status: 'active', emptyText: 'There are no active assets.' },
  { slug: 'under-service', label: 'Under Service Assets', status: 'under_maintenance', emptyText: 'There are no assets under service.' },
  { slug: 'expired', label: 'Expired Assets', status: 'decommissioned', emptyText: 'There are no expired assets.' },
];

export const ASSET_STATUS_WORDS: Readonly<Record<AssetStatus, string>> = {
  active: 'Active',
  under_maintenance: 'Under Service',
  decommissioned: 'Expired',
};

/** A status change offered on an asset (ASSET-08). */
export interface AssetStatusAction {
  label: string;
  to: AssetStatus;
  question: string;
  /** Re-activate: the community admin only. */
  adminOnly?: boolean;
}

const SEND: AssetStatusAction = { label: 'Send to Service', to: 'under_maintenance', question: 'Send this asset to service?' };
const BACK: AssetStatusAction = { label: 'Back in Service', to: 'active', question: 'Is this asset back in service?' };
const EXPIRE: AssetStatusAction = { label: 'Mark Expired', to: 'decommissioned', question: 'Mark this asset expired? It leaves the active register.' };
const REACTIVATE: AssetStatusAction = { label: 'Re-activate', to: 'active', question: 'Re-activate this expired asset?', adminOnly: true };

/** The row's own action column: Send to Service, Back in Service or Re-activate. */
export function primaryStatusAction(status: string): AssetStatusAction {
  if (status === 'under_maintenance') return BACK;
  if (status === 'decommissioned') return REACTIVATE;
  return SEND;
}

/** Every move an asset may make from its status, for the Edit page and the row menu. */
export function statusActions(status: string): AssetStatusAction[] {
  if (status === 'decommissioned') return [REACTIVATE];
  return [primaryStatusAction(status), EXPIRE];
}

export function mayRunStatusAction(action: AssetStatusAction, role: string | null): boolean {
  return !action.adminOnly || role === 'community_admin' || role === 'super_admin';
}
