'use client';

import { type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface ExportColumn {
  key: string;
  label: string;
}

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: ExportColumn[];
}

function escapeCsvValue(val: unknown): string {
  const str = val == null ? '' : String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ data, filename, columns }: ExportButtonProps): ReactNode {
  function exportCsv(): void {
    const header = columns.map((col) => escapeCsvValue(col.label)).join(',');
    const rows = data.map((row) =>
      columns.map((col) => escapeCsvValue(row[col.key])).join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
  }

  function exportExcel(): void {
    const header = columns.map((col) => col.label).join('\t');
    const rows = data.map((row) =>
      columns.map((col) => String(row[col.key] ?? '')).join('\t'),
    );
    const tsv = [header, ...rows].join('\n');
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
    downloadBlob(blob, `${filename}.xls`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCsv}>Download as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>Download as Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
