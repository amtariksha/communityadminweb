'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ImportFlow, type ImportFlowProps } from './import-flow';
import { ImportGrid } from './import-grid';

/**
 * Both ways into one import (SB-13): the Excel upload and the on-screen
 * grid, as two links on the same page (`?door=grid` opens the grid), so
 * either can be linked to and reloaded.
 */
export function ImportDoors(props: Omit<ImportFlowProps, 'onApplied'>): ReactNode {
  const pathname = usePathname() ?? '';
  const params = useSearchParams();
  const door = params?.get('door') === 'grid' ? 'grid' : 'excel';
  const hrefFor = (next: 'grid' | 'excel'): string => {
    const query = new URLSearchParams(params?.toString() ?? '');
    query.set('door', next);
    return `${pathname}?${query.toString()}`;
  };
  const tab = (value: 'grid' | 'excel', label: string): ReactNode => (
    <Link href={hrefFor(value)} aria-current={door === value ? 'page' : undefined} className={cn('rounded-md px-3 py-1 text-sm', door === value ? 'bg-primary text-primary-foreground' : 'text-primary hover:underline')}>
      {label}
    </Link>
  );
  return (
    <div className="space-y-3">
      <nav aria-label="Way in" className="flex gap-2">
        {tab('excel', 'Upload Excel')}
        {tab('grid', 'Type in a grid')}
      </nav>
      {door === 'grid' ? <ImportGrid {...props} /> : <ImportFlow {...props} />}
    </div>
  );
}
