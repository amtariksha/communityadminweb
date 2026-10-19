'use client';

import { type ReactNode } from 'react';
import { useDocumentCategories } from '@/hooks';
import type { UnitPanelDocument } from '@/hooks/use-unit-panel';
import { UploadDocumentDialog } from '../../documents/upload-document-dialog';
import { formatDate } from '@/lib/utils';
import { PanelSection } from './panel-section';
import { PanelTable, type PanelColumn } from './panel-table';
import { fileTypeLabel } from './unit-labels';

const COLUMNS: PanelColumn<UnitPanelDocument>[] = [
  { header: 'Title', cell: (row) => row.title },
  { header: 'File type', cell: (row) => fileTypeLabel(row) },
  { header: 'By', cell: (row) => row.uploaded_by_name ?? '—' },
  { header: 'Uploaded On', cell: (row) => formatDate(row.created_at) },
];

interface PanelDocumentsProps {
  documents: UnitPanelDocument[];
  count: number;
  unit: { id: string; unit_number: string; block: string | null };
}

/** Documents of the unit, with Upload (today's upload, this unit only). */
export function PanelDocuments({ documents, count, unit }: PanelDocumentsProps): ReactNode {
  const categories = useDocumentCategories();
  return (
    <PanelSection title="Documents" count={count} actions={<UploadDocumentDialog categories={categories.data ?? []} units={[unit]} />}>
      <PanelTable label="Documents" columns={COLUMNS} rows={documents} rowKey={(row) => row.id} />
      {count > documents.length && (
        <p className="pt-2 text-xs text-muted-foreground">
          Showing the newest {documents.length} of {count}. All of them are under Admin Files › Unit Specific Files.
        </p>
      )}
    </PanelSection>
  );
}
