'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  projectListParams,
  useProjectList,
  useProjectOptions,
  type ProjectFilters,
  type ProjectRow,
} from '@/hooks/use-projects';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { PROJECT_WRITE_ROLES, PROJECTS_BASE } from '@/lib/project-states';
import { formatDate } from '@/lib/utils';

const COLUMNS: DataTableColumn<ProjectRow>[] = [
  { key: 'no', header: 'Project No', cell: (row) => row.project_no },
  { key: 'description', header: 'Description', cell: (row) => row.topic },
  { key: 'category', header: 'Category', cell: (row) => row.category },
  { key: 'start', header: 'Start Date', cell: (row) => (row.start_date ? formatDate(row.start_date) : '—') },
  { key: 'target', header: 'Target Date', cell: (row) => (row.target_date ? formatDate(row.target_date) : '—') },
  { key: 'driven', header: 'Driven By', cell: (row) => row.driven_by_name ?? 'Unassigned' },
  { key: 'status', header: 'Status', cell: (row) => PROJECT_STATUS_LABELS[row.status] },
  { key: 'priority', header: 'Priority', cell: (row) => PROJECT_PRIORITY_LABELS[row.priority] },
  { key: 'last', header: 'LastUpdate', cell: (row) => row.last_note ?? '—' },
  { key: 'updated', header: 'Updated On', cell: (row) => (row.last_note_at ? formatDate(row.last_note_at) : '—') },
];

const EDIT: DataTableAction<ProjectRow>[] = [{ key: 'edit', header: 'Edit', label: 'Edit', href: (row) => `${PROJECTS_BASE}/${row.id}` }];

function FilterSelect(props: { id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id} className="text-xs text-muted-foreground">
        {props.label}
      </Label>
      <Select id={props.id} value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        {props.children}
      </Select>
    </div>
  );
}

/** Driven By · Category · Status · Priority, applied by Filter Projects (PROJ-S3). */
function ProjectFilterBar({ draft, set, apply }: { draft: Record<string, string>; set: (key: string, value: string) => void; apply: () => void }): ReactNode {
  const options = useProjectOptions().data;
  return (
    <>
      <FilterSelect id="project-driven-by" label="Driven By" value={draft.driven_by ?? ''} onChange={(value) => set('driven_by', value)}>
        <option value="">All</option>
        <option value="unassigned">Unassigned</option>
        {(options?.drivers ?? []).map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name ?? 'Unnamed'}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect id="project-category" label="Category" value={draft.category ?? ''} onChange={(value) => set('category', value)}>
        <option value="">All</option>
        {(options?.categories ?? []).map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect id="project-status" label="Status" value={draft.status ?? ''} onChange={(value) => set('status', value)}>
        <option value="">All</option>
        {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect id="project-priority" label="Priority" value={draft.priority ?? ''} onChange={(value) => set('priority', value)}>
        <option value="">All</option>
        {Object.entries(PROJECT_PRIORITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>
      <Button type="button" size="sm" variant="outline" onClick={apply}>
        Filter Projects
      </Button>
    </>
  );
}

/**
 * Projects › List View (PROJ-S3): every project, filtered by Driven By,
 * Category, Status and Priority when Filter Projects is pressed, with its
 * own search, the export strip and Edit on each row.
 */
export function ProjectsList(): ReactNode {
  // The four selects as chosen; they apply on Filter Projects.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<ProjectFilters>({});
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const filters = useMemo(() => ({ ...applied, q: q || undefined }), [applied, q]);
  const query = useProjectList({ ...filters, page, limit: pageSize });
  const canWrite = PROJECT_WRITE_ROLES.has(currentRole() ?? '');

  if (isNotDeployed(query.error)) {
    return <p className="text-sm text-muted-foreground">Projects are not available yet.</p>;
  }
  const apply = (): void => {
    setApplied({ ...draft } as ProjectFilters);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Link href={`${PROJECTS_BASE}/new`} className={buttonVariants({ size: 'sm' })} data-slot="button" data-size="sm">
            Create Project
          </Link>
        </div>
      )}
      <DataTable
        title="Projects"
        columns={COLUMNS}
        actions={EDIT}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: q, onChange: (value) => { setQ(value); setPage(1); }, placeholder: 'Search projects' }}
        filters={<ProjectFilterBar draft={draft} set={(key, value) => setDraft((current) => ({ ...current, [key]: value }))} apply={apply} />}
        export={{ path: '/projects/export', params: projectListParams(filters), filename: 'projects' }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No projects."
      />
    </div>
  );
}
