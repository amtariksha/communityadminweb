'use client';

import { type ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AgreementVersionSummary } from '@/hooks/use-society-agreement';
import { formatDate } from '@/lib/utils';

/** Every version of the agreement, newest first; versions are never deleted. */
export function AgreementVersionsTable({ versions }: { versions: readonly AgreementVersionSummary[] }): ReactNode {
  if (versions.length === 0) return null;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Published On</TableHead>
          <TableHead className="text-right">Accepted By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((version) => (
          <TableRow key={version.id}>
            <TableCell>{version.version}</TableCell>
            <TableCell>{version.status === 'published' ? 'Published' : 'Draft'}</TableCell>
            <TableCell>{version.published_at ? formatDate(version.published_at) : '—'}</TableCell>
            <TableCell className="text-right">{version.status === 'published' ? version.acceptances : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
