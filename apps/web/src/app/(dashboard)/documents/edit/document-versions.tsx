'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import type { DocumentFileVersion } from '@/hooks/use-document-files';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { openDocumentFile } from '../files/file-actions';

/** Versions under Edit File (FILE-S4): every upload of the file stays downloadable. */
export function DocumentVersions({ versions }: { versions: readonly DocumentFileVersion[] }): ReactNode {
  const { addToast } = useToast();

  async function download(version: DocumentFileVersion): Promise<void> {
    try {
      await openDocumentFile(version, true);
    } catch (error) {
      addToast({ title: 'Could not download', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <section aria-labelledby="versions-heading" className="space-y-2">
      <h3 id="versions-heading" className="font-semibold">
        Versions
      </h3>
      <Table aria-label="Versions">
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>File Name</TableHead>
            <TableHead>Uploaded On</TableHead>
            <TableHead>Uploaded by</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Download</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map((version) => (
            <TableRow key={version.id}>
              <TableCell>{version.version_number}</TableCell>
              <TableCell>{version.file_name}</TableCell>
              <TableCell>{formatDate(version.created_at)}</TableCell>
              <TableCell>{version.uploaded_by_name ?? '—'}</TableCell>
              <TableCell>{version.change_notes ?? ''}</TableCell>
              <TableCell>
                <Button type="button" variant="outline" size="sm" onClick={() => void download(version)}>
                  Download
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
