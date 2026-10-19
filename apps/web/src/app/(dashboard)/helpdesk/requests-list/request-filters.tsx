'use client';

import { type ReactNode } from 'react';
import { CountedSelect, type CountedOption } from '@/components/data-table';
import type { TicketFacetOption, TicketFacets } from '@/hooks';
import type { AdminLayout } from '@/lib/admin-layout';
import type { HelpdeskScope } from '@/lib/helpdesk-scopes';
import { ticketStatusLabel } from '@/lib/ticket-status';

export interface RequestFilterValues {
  status: string;
  category_id: string;
  assigned_to: string;
  block: string;
  unit_id: string;
  type: string;
  subcategory_id: string;
  serviced_by: string;
}

export const NO_REQUEST_FILTERS: RequestFilterValues = {
  status: '',
  category_id: '',
  assigned_to: '',
  block: '',
  unit_id: '',
  type: '',
  subcategory_id: '',
  serviced_by: '',
};

interface RequestFiltersProps {
  scope: HelpdeskScope;
  layout: AdminLayout;
  facets: TicketFacets | undefined;
  values: RequestFilterValues;
  onChange: (values: RequestFilterValues) => void;
}

/** Facet options; `none` names the empty bucket (no block, no unit, nobody). */
function optionsOf(entries: readonly TicketFacetOption[] | undefined, none?: string): CountedOption[] {
  return (entries ?? []).flatMap((entry) => {
    if (entry.value === null) return none ? [{ value: none, label: entry.label, count: entry.count }] : [];
    return [{ value: entry.value, label: entry.label, count: entry.count }];
  });
}

function statusOptions(scope: HelpdeskScope, layout: AdminLayout, facets?: TicketFacets): CountedOption[] {
  const counts = new Map((facets?.status ?? []).map((entry) => [entry.value, entry.count]));
  return scope.statuses.map((status) => ({
    value: status,
    label: ticketStatusLabel(status, layout),
    count: counts.get(status) ?? 0,
  }));
}

/**
 * The list filters of HELP-S7 / S8, each option "name (n)" with counts
 * inside the scope from GET /tickets/facets. Closed Requests has no
 * Status filter. Type is Resident / Community (HELP-15), then Sub-category
 * (HELP-17) and Serviced By (HELP-18), each shown once the server counts it.
 */
export function RequestFilters({ scope, layout, facets, values, onChange }: RequestFiltersProps): ReactNode {
  const set = (key: keyof RequestFilterValues) => (value: string) => onChange({ ...values, [key]: value });
  return (
    <>
      {scope.statuses.length > 0 && (
        <CountedSelect
          id="request-status"
          label="Status"
          allLabel="All Open"
          value={values.status}
          onChange={set('status')}
          options={statusOptions(scope, layout, facets)}
        />
      )}
      <CountedSelect
        id="request-category"
        label="Category"
        allLabel="All"
        value={values.category_id}
        onChange={set('category_id')}
        options={optionsOf(facets?.category)}
      />
      {(facets?.subcategory?.length ?? 0) > 0 && (
        <CountedSelect
          id="request-subcategory"
          label="Sub-category"
          allLabel="All"
          value={values.subcategory_id}
          onChange={set('subcategory_id')}
          options={optionsOf(facets?.subcategory)}
        />
      )}
      {facets?.serviced_by && (
        <CountedSelect
          id="request-serviced-by"
          label="Serviced By"
          allLabel="All"
          value={values.serviced_by}
          onChange={set('serviced_by')}
          options={optionsOf(facets.serviced_by, 'unassigned')}
        />
      )}
      <CountedSelect
        id="request-driven-by"
        label="Driven By"
        allLabel="All"
        value={values.assigned_to}
        onChange={set('assigned_to')}
        options={optionsOf(facets?.driven_by, 'unassigned')}
      />
      <CountedSelect
        id="request-block"
        label="Block"
        allLabel="All Block"
        value={values.block}
        onChange={set('block')}
        options={optionsOf(facets?.block, 'none')}
      />
      <CountedSelect
        id="request-unit"
        label="Unit"
        allLabel="All"
        value={values.unit_id}
        onChange={set('unit_id')}
        options={optionsOf(facets?.unit, 'none')}
      />
      <CountedSelect
        id="request-type"
        label="Type"
        allLabel="All"
        value={values.type}
        onChange={set('type')}
        options={optionsOf(facets?.type)}
      />
    </>
  );
}
