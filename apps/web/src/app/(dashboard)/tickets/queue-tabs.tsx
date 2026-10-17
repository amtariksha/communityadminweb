'use client';

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export type QueueTab = 'all' | 'overdue';

interface QueueTabsProps {
  active: QueueTab;
  onChange: (tab: QueueTab) => void;
  /** All requests in the society. */
  totalCount: number;
  /** Requests past their due time and not completed, as counted by the server. */
  overdueCount: number;
}

const BASE = 'px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors';

/** The two queues above the list; both are filtered by the server. */
export function QueueTabs({ active, onChange, totalCount, overdueCount }: QueueTabsProps): ReactNode {
  return (
    <div className="flex border-b">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`${BASE} ${
          active === 'all'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        {`All Tickets (${totalCount})`}
      </button>
      <button
        type="button"
        onClick={() => onChange('overdue')}
        className={`${BASE} ${
          active === 'overdue'
            ? 'border-destructive text-destructive font-semibold'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        {`SLA Overdue (${overdueCount})`}
      </button>
    </div>
  );
}
