'use client';

import type { ReactNode } from 'react';
import { Download, Eye, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOpenStoredFile } from '@/hooks/use-stored-file';
import { formatDate } from '@/lib/utils';
import type { Document as SocietyDocument } from '@communityos/shared';
import { canWriteDocuments } from '../files/file-actions';
import { ExpiryBadge, formatFileSize, getFileIcon, getFileType, uploaderName } from './document-file-type';

export interface DocumentRowActions {
  onView: (doc: SocietyDocument) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** The document being deleted, if any. */
  deletingId?: string;
}

interface DocumentsTableProps extends DocumentRowActions {
  documents: readonly SocietyDocument[];
  loading: boolean;
  daysLeftById: ReadonlyMap<string, number>;
}

const COLUMNS = ['Document', 'File Type', 'Size', 'Uploaded', 'Uploaded by', 'Status'] as const;

function TableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {[...COLUMNS, 'Actions'].map((column) => (
            <TableCell key={column}>
              <Skeleton className="h-5 w-20" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function RowActions({ doc, actions }: { doc: SocietyDocument; actions: DocumentRowActions }): ReactNode {
  const deleting = actions.deletingId === doc.id;
  const openFile = useOpenStoredFile();
  const download = (): Promise<void> => openFile(doc.file_url, { disposition: 'attachment', fileName: doc.file_name || doc.title });
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" title="Download" onClick={() => void download()}>
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="View" onClick={() => actions.onView(doc)}>
        <Eye className="h-4 w-4" />
      </Button>
      {canWriteDocuments() && (
        <Button variant="ghost" size="icon" title="Edit" onClick={() => actions.onEdit(doc.id)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" title="Delete" onClick={() => actions.onDelete(doc.id)} disabled={deleting}>
        {deleting ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <Trash2 className="h-4 w-4 text-destructive" />}
      </Button>
    </div>
  );
}

function DocumentRow({ doc, daysLeft, actions }: { doc: SocietyDocument; daysLeft?: number; actions: DocumentRowActions }): ReactNode {
  const fileType = getFileType(doc);
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          {getFileIcon(fileType)}
          <div>
            <span className="font-medium">{doc.title}</span>
            {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{fileType.toUpperCase()}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatFileSize(doc.file_size)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(doc.created_at)}</TableCell>
      <TableCell className="text-muted-foreground">{uploaderName(doc)}</TableCell>
      <TableCell>
        <ExpiryBadge daysLeft={daysLeft} />
      </TableCell>
      <TableCell className="text-right">
        <RowActions doc={doc} actions={actions} />
      </TableCell>
    </TableRow>
  );
}

/** The standard Documents list (FILE-21 adds Uploaded by). */
export function DocumentsTable({ documents, loading, daysLeftById, ...actions }: DocumentsTableProps): ReactNode {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableSkeleton />
        ) : (
          documents.map((doc) => <DocumentRow key={doc.id} doc={doc} daysLeft={daysLeftById.get(doc.id)} actions={actions} />)
        )}
      </TableBody>
    </Table>
  );
}
