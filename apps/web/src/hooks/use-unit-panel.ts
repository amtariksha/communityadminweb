'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * The classic Approved Users screen (UNIT-11 / UNIT-12): the unit list as
 * units or as people, with the society's totals, and one unit's panel.
 */

export type UnitListView = 'units' | 'users';

/** Rows the left list loads at a time; "View More" loads the next lot. */
export const UNIT_LIST_PAGE_SIZE = 50;

export interface UnitTotals {
  units: number;
  users: number;
}

export interface UnitListItem {
  id: string;
  unit_number: string;
  block: string | null;
  owner_name?: string | null;
  /** Every current owner (APIs from UNIT-11 on). */
  owner_names?: string[];
}

export interface UnitUserItem {
  member_id: string;
  unit_id: string;
  unit_number: string;
  block: string | null;
  name: string | null;
  member_type: string;
}

interface ListPage<Row> {
  data: Row[];
  total: number;
  totals?: UnitTotals;
}

export interface UnitListFilters {
  search: string;
  block: string | null;
}

export interface UnitPanelMember {
  id: string;
  user_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  member_type: string;
  is_primary_contact: boolean;
  move_in_date: string | null;
}

export interface UnitPanelFamilyMember extends UnitPanelMember {
  parent_member_id: string | null;
  linked_to: string | null;
}

export interface UnitPanelVehicle {
  id: string;
  registration_number: string;
  vehicle_type: string;
  slot_number: string | null;
  sticker_number: string | null;
  status: string;
  member_name: string | null;
}

export interface UnitPanelStaff {
  worker_id: string;
  name: string;
  phone: string;
  category: string;
  since: string | null;
}

export interface UnitPanelDocument {
  id: string;
  title: string;
  file_name: string;
  mime_type: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface UnitPanelCounts {
  members: number;
  family: number;
  vehicles: number;
  staff: number;
  documents: number;
}

export interface UnitPanel {
  unit: { id: string; unit_number: string; block: string | null };
  members: UnitPanelMember[];
  family: UnitPanelFamilyMember[];
  vehicles: UnitPanelVehicle[];
  staff: UnitPanelStaff[];
  documents: UnitPanelDocument[];
  counts: UnitPanelCounts;
}

export const unitPanelKeys = {
  list: (view: UnitListView, filters: UnitListFilters) => ['units', 'approved-list', view, filters] as const,
  panel: (unitId: string) => ['units', 'panel', unitId] as const,
};

function listParams(view: UnitListView, filters: UnitListFilters, page: number): Record<string, string> {
  const params: Record<string, string> = { page: String(page), limit: String(UNIT_LIST_PAGE_SIZE) };
  if (view === 'users') params.view = 'users';
  if (filters.search) params.search = filters.search;
  if (filters.block) params.block = filters.block;
  return params;
}

function useListPages<Row>(view: UnitListView, filters: UnitListFilters, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: unitPanelKeys.list(view, filters),
    enabled,
    initialPageParam: 1,
    // The screen says what failed (e.g. an API without the people list).
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchUnitListPage({ pageParam, signal }) {
      return api.get<ListPage<Row>>('/units', { params: listParams(view, filters, pageParam), signal });
    },
    getNextPageParam: function nextPage(last, pages) {
      const loaded = pages.reduce((sum, page) => sum + page.data.length, 0);
      return last.data.length > 0 && loaded < last.total ? pages.length + 1 : undefined;
    },
  });
}

/** Units for the left list, 50 at a time. */
export function useApprovedUnitList(filters: UnitListFilters, enabled = true) {
  return useListPages<UnitListItem>('units', filters, enabled);
}

/** People (current members) for the left list, 50 at a time. */
export function useApprovedUserList(filters: UnitListFilters, enabled = true) {
  return useListPages<UnitUserItem>('users', filters, enabled);
}

/** UNIT-11 — every section of one unit in one read. */
export function useUnitPanel(unitId: string) {
  return useQuery({
    queryKey: unitPanelKeys.panel(unitId),
    enabled: unitId !== '',
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchUnitPanel({ signal }) {
      return api.get<{ data: UnitPanel }>(`/units/${unitId}/panel`, { signal }).then((res) => res.data);
    },
  });
}
