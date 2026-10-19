import { type ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface PanelColumn<Row> {
  header: string;
  cell: (row: Row) => ReactNode;
}

interface PanelTableProps<Row> {
  label: string;
  columns: readonly PanelColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
}

/** The small table inside a panel section (vehicles, staff, documents, family). */
export function PanelTable<Row>({ label, columns, rows, rowKey }: PanelTableProps<Row>): ReactNode {
  return (
    <Table aria-label={label}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.header}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.header}>{column.cell(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
