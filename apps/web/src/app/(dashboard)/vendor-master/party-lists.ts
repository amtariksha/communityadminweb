import type { StatusRoute } from '@/components/layout/menu/status-menu';

/** The two lists of Vendor Master (VEND-S1, VEND-S3), each Active / In-Active (SB-05). */
export type PartyKind = 'expense' | 'income';

export interface PartyStateRoute extends StatusRoute {
  slug: 'active' | 'inactive';
  active: boolean;
}

export const PARTY_BASES: Readonly<Record<PartyKind, string>> = {
  expense: '/vendor-master/expense',
  income: '/vendor-master/non-member-income',
};

export const PARTY_HEADINGS: Readonly<Record<PartyKind, { active: string; inactive: string; empty: string }>> = {
  expense: {
    active: 'Active Vendors for Expense Tracker',
    inactive: 'In-Active Vendors',
    empty: 'No active vendors — Add Vendor.',
  },
  income: {
    active: 'Active Vendors for Non Member Income',
    inactive: 'In-Active Vendors',
    empty: 'No parties yet — Add Vendor.',
  },
};

/** Active is the list's own route; In-Active is `<base>/inactive`. */
export function partyState(pathname: string, kind: PartyKind): PartyStateRoute {
  const inactive = pathname.replace(/\/+$/, '') === `${PARTY_BASES[kind]}/inactive`;
  return inactive
    ? { slug: 'inactive', label: 'In-Active', active: false }
    : { slug: 'active', label: 'Active', active: true };
}

export function partyFormHref(kind: PartyKind, id?: string): string {
  return id ? `/vendor-master/vendors/${id}/edit?list=${kind}` : `/vendor-master/vendors/new?list=${kind}`;
}
