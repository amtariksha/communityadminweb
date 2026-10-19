'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { buttonVariants } from '@/components/ui/button';
import { useCustomers } from '@/hooks/use-customers';
import { useVendors } from '@/hooks/use-vendors';
import type { Vendor } from '@communityos/shared';
import { currentRole } from '@/lib/current-role';
import { tdsText } from '../vendors/vendor-form';
import type { Party } from './party-form';
import { PARTY_HEADINGS, partyFormHref, partyState, type PartyKind } from './party-lists';

// vendor.controller.ts / customer.controller.ts write roles.
const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'accountant']);

type VendorRow = Vendor & {
  default_igst_rate?: string | null;
  default_cgst_rate?: string | null;
  default_sgst_rate?: string | null;
};

const rate = (value: string | number | null | undefined): string => (value == null ? '—' : `${Number(value)}%`);
const dash = (value: string | null | undefined): string => value || '—';

const COMMON = <Row extends { name: string; contact_person?: string | null; phone?: string | null; email?: string | null }>(): DataTableColumn<Row>[] => [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'contact', header: 'Contact', cell: (row) => dash(row.contact_person) },
  { key: 'phone', header: 'Phone', cell: (row) => dash(row.phone) },
  { key: 'email', header: 'Email', cell: (row) => dash(row.email) },
];

// VEND-S1 columns: Id = the Vendor ID, Comments = the notes (VEND-08).
const VENDOR_COLUMNS: DataTableColumn<VendorRow>[] = [
  { key: 'id', header: 'Id', cell: (row) => dash(row.vendor_code) },
  ...COMMON<VendorRow>(),
  { key: 'tds', header: 'TDS', cell: (row) => tdsText(row) },
  { key: 'gstin', header: 'GSTIN', cell: (row) => dash(row.gstin) },
  { key: 'igst', header: 'IGST', cell: (row) => rate(row.default_igst_rate) },
  { key: 'cgst', header: 'CGST', cell: (row) => rate(row.default_cgst_rate) },
  { key: 'sgst', header: 'SGST', cell: (row) => rate(row.default_sgst_rate) },
  { key: 'comments', header: 'Comments', cell: (row) => dash(row.notes) },
];

// VEND-S3 columns.
const PARTY_COLUMNS: DataTableColumn<Party>[] = [
  { key: 'id', header: 'Id', cell: (row) => dash(row.party_code) },
  ...COMMON<Party>(),
  { key: 'tds', header: 'TDS', cell: (row) => tdsText({ tds_rate: row.tds_rate == null ? null : Number(row.tds_rate), tds_section: row.tds_section ?? null }) },
  { key: 'gstin', header: 'GSTIN', cell: (row) => dash(row.gstin) },
  { key: 'comments', header: 'Comments', cell: (row) => dash(row.notes) },
];

interface ListFilters {
  search?: string;
  is_active: boolean;
  page: number;
  limit: number;
}

interface ListQuery<Row> {
  data?: { data: Row[]; total: number };
  isLoading: boolean;
  error: unknown;
  refetch: () => unknown;
}

interface ListViewProps<Row extends { id: string }> {
  kind: PartyKind;
  columns: DataTableColumn<Row>[];
  useRows: (filters: ListFilters) => ListQuery<Row>;
}

function ListView<Row extends { id: string }>({ kind, columns, useRows }: ListViewProps<Row>): ReactNode {
  const state = partyState(usePathname(), kind);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = useRows({ search: search || undefined, is_active: state.active, page, limit: pageSize });
  const headings = PARTY_HEADINGS[kind];
  const canWrite = WRITE_ROLES.has(currentRole() ?? '');
  const title = state.active ? headings.active : headings.inactive;
  const total = query.data?.total ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          {title} ({total})
        </h3>
        {canWrite && (
          <Link href={partyFormHref(kind)} className={buttonVariants()} data-slot="button" data-size="default">
            Add Vendor
          </Link>
        )}
      </div>
      <DataTable<Row>
        title={title}
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        search={{ value: search, onChange: (next) => { setSearch(next); setPage(1); }, placeholder: 'Name, PAN, GSTIN, contact, phone or email' }}
        export={{
          path: kind === 'expense' ? '/vendors/export' : '/customers/export',
          params: { is_active: String(state.active), ...(search ? { search } : {}) },
          filename: kind === 'expense' ? 'vendors' : 'non-member-income-parties',
        }}
        actions={canWrite ? [{ key: 'edit', header: 'Edit', label: 'Edit', href: (row) => partyFormHref(kind, row.id) }] : []}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText={search ? 'No vendor matches.' : state.active ? headings.empty : 'No in-active vendors.'}
      />
    </div>
  );
}

const useVendorRows = (filters: ListFilters) => useVendors(filters) as unknown as ListQuery<VendorRow>;
const usePartyRows = (filters: ListFilters) => useCustomers(filters) as unknown as ListQuery<Party>;

/**
 * Vendor Master › Vendors For Expense / Vendors for Non Member Income
 * (VEND-S1, VEND-S3): Active or In-Active from the route, a wide list
 * with nothing behind a detail view, search, the whole-result export and
 * Edit in its own column, opening the form as a page.
 */
export function PartyList({ kind }: { kind: PartyKind }): ReactNode {
  return kind === 'expense' ? (
    <ListView<VendorRow> kind="expense" columns={VENDOR_COLUMNS} useRows={useVendorRows} />
  ) : (
    <ListView<Party> kind="income" columns={PARTY_COLUMNS} useRows={usePartyRows} />
  );
}
