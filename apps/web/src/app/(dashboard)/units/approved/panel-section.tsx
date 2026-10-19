import { type ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  count: number;
  children: ReactNode;
}

/** One accordion section of the unit panel, its count in the heading (UNIT-S5). */
export function PanelSection({ title, count, children }: PanelSectionProps): ReactNode {
  return (
    <details open className="rounded-md border bg-card" aria-label={title}>
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">
        {title} ({count})
      </summary>
      <div className="border-t px-3 py-2">
        {count === 0 ? <p className="text-sm text-muted-foreground">No data</p> : children}
      </div>
    </details>
  );
}
