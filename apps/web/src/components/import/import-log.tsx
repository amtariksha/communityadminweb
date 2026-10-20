'use client';

import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useImportBatches, type ImportBatch } from '@/hooks/use-imports';

const STATUS: Record<ImportBatch['status'], { word: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  applied: { word: 'Saved', variant: 'success' },
  previewed: { word: 'Previewed', variant: 'secondary' },
  failed: { word: 'Failed', variant: 'destructive' },
};

/** dd/mm/yyyy hh:mm in India. */
function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** SB-13 import log: the last uploads of a module (or one type) — who, when, which file, how many rows. */
export function ImportLog({ endpoint, type, labels }: { endpoint: string; type?: string; labels?: Record<string, string> }): ReactNode {
  const batches = useImportBatches(endpoint, type);
  if (!batches.data || batches.data.data.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Recent uploads</h3>
      <Table aria-label="Recent uploads">
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Upload</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Rows</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.data.data.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell>{when(batch.applied_at ?? batch.created_at)}</TableCell>
              <TableCell>{batch.applied_by_name ?? batch.created_by_name ?? '—'}</TableCell>
              <TableCell>{labels?.[batch.import_type] ?? batch.import_type}</TableCell>
              <TableCell>{batch.file_name ?? 'On-screen grid'}</TableCell>
              <TableCell>
                {batch.status === 'applied' ? `${batch.applied_rows} of ${batch.total_rows} saved` : `${batch.total_rows} read, ${batch.error_rows} with errors`}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS[batch.status].variant}>{STATUS[batch.status].word}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
