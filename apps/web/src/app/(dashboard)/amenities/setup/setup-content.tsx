'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { buttonVariants } from '@/components/ui/button';
import { useAmenities, type Amenity } from '@/hooks';
import { formatCurrency } from '@/lib/utils';
import { formatAmenityType, formatPricingType } from '../amenity-labels';

type SetupStatus = 'active' | 'inactive';

const PAGE_SIZES = [10, 25, 50] as const;

const COLUMNS: DataTableColumn<Amenity>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name, className: 'font-medium' },
  { key: 'type', header: 'Type', cell: (row) => formatAmenityType(row.amenity_type) },
  {
    key: 'charging',
    header: 'Charging',
    cell: (row) =>
      row.pricing_type === 'free' ? 'Free' : `${formatPricingType(row.pricing_type)} · ${formatCurrency(Number(row.price_per_unit ?? 0))}`,
  },
  { key: 'notes', header: 'Notes', cell: (row) => row.rules ?? '', className: 'max-w-[320px] whitespace-pre-line text-muted-foreground' },
];

const ACTIONS: DataTableAction<Amenity>[] = [
  { key: 'edit', header: 'Edit', label: 'Edit', href: (row) => `/amenities/${row.id}/edit` },
];

const SECTIONS: Record<SetupStatus, { title: string; empty: string }> = {
  active: { title: 'Active Amenities', empty: 'No amenities yet — Add Amenity.' },
  inactive: { title: 'Inactive Amenities', empty: 'No inactive amenities.' },
};

function AmenitySection({ status, amenities, loading }: { status: SetupStatus; amenities: readonly Amenity[]; loading: boolean }): ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const rows = useMemo(() => {
    const needle = search.toLowerCase();
    return amenities.filter((row) => row.is_active === (status === 'active') && row.name.toLowerCase().includes(needle));
  }, [amenities, status, search]);
  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const { title, empty } = SECTIONS[status];
  const exportParams: Record<string, string> = { status, ...(search ? { search } : {}) };

  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <DataTable<Amenity>
        title={title}
        columns={COLUMNS}
        actions={ACTIONS}
        rows={rows.slice((page - 1) * pageSize, page * pageSize)}
        rowKey={(row) => row.id}
        total={rows.length}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: search, onChange: onSearch, placeholder: 'Search amenity' }}
        export={{ path: '/amenities/export', params: exportParams, filename: status === 'active' ? 'active-amenities' : 'inactive-amenities' }}
        loading={loading}
        emptyText={empty}
      />
    </section>
  );
}

/**
 * Amenity & Event › Setup › Amenity (AMEN-10, screen AMEN-S1): active and
 * inactive amenities in their own sections; Add Amenity and Edit open the
 * amenity form as a page. Income Account and Auto Cancel arrive with
 * AMEN-21 and AMEN-40; Setup Notifications with AMEN-45.
 */
export function SetupContent(): ReactNode {
  const amenitiesQuery = useAmenities();
  const amenities = amenitiesQuery.data?.data ?? [];
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/amenities/new" className={buttonVariants()} data-slot="button" data-size="default">
          Add Amenity
        </Link>
      </div>
      <AmenitySection status="active" amenities={amenities} loading={amenitiesQuery.isLoading} />
      <AmenitySection status="inactive" amenities={amenities} loading={amenitiesQuery.isLoading} />
    </div>
  );
}
