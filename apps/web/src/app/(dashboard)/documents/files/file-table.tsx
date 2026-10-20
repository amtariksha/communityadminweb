'use client';

import { type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn, type DataTableSearch } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { useDeleteDocument } from '@/hooks/use-documents';
import { useOpenStoredFile } from '@/hooks/use-stored-file';
import type { DocumentFile } from '@/hooks/use-document-files';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { audienceLabel, canArchiveDocuments, canWriteDocuments } from './file-actions';

export interface FileTableProps {
  title: string;
  rows: readonly DocumentFile[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  search?: DataTableSearch;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyText: string;
  /** Resident Documents: who each file is for. */
  showAudience?: boolean;
  /** Where Edit returns to. */
  returnTo: string;
}

function columns(showAudience: boolean): DataTableColumn<DocumentFile>[] {
  const list: DataTableColumn<DocumentFile>[] = [
    {
      key: 'name',
      header: 'File Name',
      text: (row) => row.title,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          {row.file_name !== row.title && <p className="text-xs text-muted-foreground">{row.file_name}</p>}
        </div>
      ),
    },
    { key: 'uploaded', header: 'Uploaded On', cell: (row) => formatDate(row.created_at) },
    { key: 'by', header: 'Uploaded by', cell: (row) => row.uploaded_by_name ?? '—' },
  ];
  if (showAudience) list.push({ key: 'audience', header: 'Audience', cell: (row) => audienceLabel(row.audience_role) });
  return list;
}

/**
 * The file list of Admin Files (FILE-S1, S2, S6): S.No, name, when and by
 * whom, then View · Download · Edit · Archive each in its own column.
 */
export function FileTable(props: FileTableProps): ReactNode {
  const { addToast } = useToast();
  const archive = useDeleteDocument();

  const openFile = useOpenStoredFile();
  const open = (row: DocumentFile, download: boolean): Promise<void> =>
    openFile(row.file_url, { disposition: download ? 'attachment' : 'inline', fileName: row.file_name });

  function archiveFile(row: DocumentFile): void {
    if (!window.confirm(`Archive "${row.title}"? It is hidden everywhere and kept in the records.`)) return;
    archive.mutate(row.id, {
      onSuccess: () => addToast({ title: 'File archived', variant: 'success' }),
      onError: (error) => addToast({ title: 'Could not archive', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  const actions: DataTableAction<DocumentFile>[] = [
    { key: 'view', header: 'View', label: 'View', onClick: (row) => void open(row, false) },
    { key: 'download', header: 'Download', label: 'Download', onClick: (row) => void open(row, true) },
  ];
  if (canWriteDocuments()) {
    actions.push({
      key: 'edit',
      header: 'Action',
      label: 'Edit',
      href: (row) => `/documents/${row.id}/edit?return=${encodeURIComponent(props.returnTo)}`,
    });
  }
  if (canArchiveDocuments()) {
    actions.push({ key: 'archive', header: 'Archive', label: 'Archive', onClick: archiveFile });
  }

  return (
    <DataTable
      title={props.title}
      columns={columns(props.showAudience ?? false)}
      actions={actions}
      rows={props.rows}
      rowKey={(row) => row.id}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      onPageChange={props.onPageChange}
      onPageSizeChange={props.onPageSizeChange}
      search={props.search}
      loading={props.loading}
      error={props.error}
      onRetry={props.onRetry}
      emptyText={props.emptyText}
    />
  );
}
