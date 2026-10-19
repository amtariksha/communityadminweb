'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { CatalogueRow } from '@/hooks/use-reports';
import { PublishDialog } from './publish-dialog';

export interface PublishSelection {
  selected: ReadonlySet<string>;
  toggle: (key: string) => void;
}

/** The ticks of an index page (page state only, never stored). */
export function usePublishSelection(): PublishSelection & { clear: () => void } {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  return {
    selected,
    toggle: (key) =>
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    clear: () => setSelected(new Set()),
  };
}

/** "Publish selected reports to Notice Board": enabled once a row is ticked (REP-S1). */
export function PublishSelectedButton({ rows, selection }: { rows: readonly CatalogueRow[]; selection: PublishSelection }): ReactNode {
  const [open, setOpen] = useState(false);
  const chosen = rows.filter((row) => selection.selected.has(row.key));
  return (
    <>
      <Button type="button" variant="outline" disabled={chosen.length === 0} onClick={() => setOpen(true)}>
        Publish selected reports to Notice Board
      </Button>
      {open && <PublishDialog rows={chosen} open={open} onOpenChange={setOpen} />}
    </>
  );
}
