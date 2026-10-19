import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AssetChecklist } from '@/hooks/use-assets';
import { formatDate, frequencyLabel } from './asset-ui';

/** Master Checklists with Last Run and Next Due (ASSET-06). */
export function ChecklistsTable({ checklists }: { checklists: readonly AssetChecklist[] }): ReactNode {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Checklist Name</TableHead>
          <TableHead>Area / Wing</TableHead>
          <TableHead>Item Count</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Last Run</TableHead>
          <TableHead>Next Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {checklists.map((cl) => (
          <TableRow key={cl.id}>
            <TableCell className="font-medium">{cl.name}</TableCell>
            <TableCell>{cl.area}</TableCell>
            <TableCell>{cl.items} checkpoints</TableCell>
            <TableCell><Badge variant="outline">{frequencyLabel(cl.frequency)}</Badge></TableCell>
            <TableCell>{cl.last_run ? formatDate(cl.last_run) : 'Never'}</TableCell>
            <TableCell>{cl.next_due ? formatDate(cl.next_due) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
