'use client';

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import type { TicketScopeCounts } from '@/hooks';

export type QueueTab = 'all' | 'open' | 'closed' | 'overdue';

interface QueueTabsProps {
  active: QueueTab;
  onChange: (tab: QueueTab) => void;
  /** All requests in the society. */
  totalCount: number;
  /** Requests past their due time and not completed, as counted by the server. */
  overdueCount: number;
  /** Open and closed requests; the two tabs appear once the server counts them. */
  scopeCounts?: TicketScopeCounts;
}

const BASE = 'px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors';
const IDLE = 'border-transparent text-muted-foreground hover:text-foreground';

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }): ReactNode {
  return (
    <button type="button" onClick={onClick} className={`${BASE} ${active ? 'border-primary text-primary' : IDLE}`}>
      {children}
    </button>
  );
}

/** The queues above the list; each is filtered by the server. */
export function QueueTabs({ active, onChange, totalCount, overdueCount, scopeCounts }: QueueTabsProps): ReactNode {
  return (
    <div className="flex border-b">
      <Tab active={active === 'all'} onClick={() => onChange('all')}>
        {`All Tickets (${totalCount})`}
      </Tab>
      {scopeCounts && (
        <>
          <Tab active={active === 'open'} onClick={() => onChange('open')}>
            {`Open (${scopeCounts.open})`}
          </Tab>
          <Tab active={active === 'closed'} onClick={() => onChange('closed')}>
            {`Closed (${scopeCounts.closed})`}
          </Tab>
        </>
      )}
      <button
        type="button"
        onClick={() => onChange('overdue')}
        className={`${BASE} ${active === 'overdue' ? 'border-destructive text-destructive font-semibold' : IDLE}`}
      >
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        {`SLA Overdue (${overdueCount})`}
      </button>
    </div>
  );
}
