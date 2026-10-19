'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import { DataTable, type DataTableAction } from '@/components/data-table';
import { directoryFiltersToParams, useMemberDirectory, type DirectoryMember } from '@/hooks/use-unit-members';
import { presetFilters, REGISTER_COLUMNS, REGISTER_EMPTY, REGISTER_TITLES, type RegisterPreset } from './register-presets';

/** The registers page 100 rows at a time (MOVE-S8). */
export const REGISTER_PAGE_SIZE = 100;

const NOT_AVAILABLE = 'This register is not available yet on this server.';

/** A record page for a row: the resident record (MOVE-11), read-only for `View`. */
export function recordHref(row: Pick<DirectoryMember, 'id'>, readOnly = false): string {
  return `/move-in-out/residents/${row.id}${readOnly ? '?view=1' : ''}`;
}

/**
 * An API from before MOVE-07 ignores the register filters (status, agreement)
 * and answers today's current-members list, whose rows carry no app status:
 * that answer is not this register.
 */
export function answersRegister(rows: readonly DirectoryMember[]): boolean {
  return rows.length === 0 || rows[0].app_status !== undefined;
}

function rowAction(preset: RegisterPreset): DataTableAction<DirectoryMember> {
  if (preset === 'no_agreement') return { key: 'view', header: 'Edit', label: 'View', href: (row) => recordHref(row, true) };
  return { key: 'edit', header: 'Edit', label: 'Edit', href: (row) => recordHref(row) };
}

interface ResidentRegisterProps {
  preset: RegisterPreset;
  /** Block links above the list (SB-10); MOVE-S12 has none. */
  blockLinks?: boolean;
}

/** One resident register: owners, tenants, an agreement tab, or the deactivated (MOVE-08 / -09 / -10, UNIT-18). */
export function ResidentRegister({ preset, blockLinks = true }: ResidentRegisterProps): ReactNode {
  const pathname = usePathname();
  const params = useSearchParams();
  const block = params.get('block');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filters = { ...presetFilters(preset), ...(block ? { block } : {}), ...(search ? { search } : {}) };
  const query = useMemberDirectory({ ...filters, page, limit: REGISTER_PAGE_SIZE });
  const rows = query.data?.data ?? [];
  const supported = answersRegister(rows);
  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const hrefFor = (next: string | null): string => (next ? `${pathname}?block=${encodeURIComponent(next)}` : pathname);

  return (
    <div className="space-y-3">
      {blockLinks && <UnitBlockLinks value={block} hrefFor={hrefFor} />}
      <DataTable<DirectoryMember>
        title={REGISTER_TITLES[preset]}
        columns={REGISTER_COLUMNS[preset]}
        actions={[rowAction(preset)]}
        rows={supported ? rows : []}
        rowKey={(row) => row.id}
        total={supported ? (query.data?.total ?? 0) : 0}
        page={page}
        pageSize={REGISTER_PAGE_SIZE}
        pageSizeOptions={[REGISTER_PAGE_SIZE]}
        onPageChange={setPage}
        search={{ value: search, onChange: onSearch, placeholder: 'Name, phone or unit' }}
        export={{
          path: '/units/directory/members/export',
          params: directoryFiltersToParams(filters) ?? {},
          filename: REGISTER_TITLES[preset].toLowerCase().replace(/\s+/g, '-'),
        }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText={supported ? REGISTER_EMPTY[preset] : NOT_AVAILABLE}
      />
    </div>
  );
}
