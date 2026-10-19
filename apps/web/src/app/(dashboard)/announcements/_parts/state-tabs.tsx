'use client';

import type { ReactNode } from 'react';
import type { AnnouncementState, AnnouncementStateCounts } from '@/hooks';
import { STATE_LABELS } from './labels';

const TABS: ReadonlyArray<{ state: AnnouncementState; label: string }> = [
  { state: 'draft', label: 'Drafts' },
  { state: 'awaiting_approval', label: STATE_LABELS.awaiting_approval },
  { state: 'active', label: STATE_LABELS.active },
  { state: 'retired', label: STATE_LABELS.retired },
];

const BASE = '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors';

/** Standard layout: the four states as tabs, each with the server's count (ANN-03). */
export function StateTabs(props: {
  active: AnnouncementState;
  counts: AnnouncementStateCounts;
  onChange: (state: AnnouncementState) => void;
}): ReactNode {
  return (
    <div className="flex border-b" role="tablist" aria-label="Announcement states">
      {TABS.map((tab) => (
        <button
          key={tab.state}
          type="button"
          role="tab"
          aria-selected={props.active === tab.state}
          onClick={() => props.onChange(tab.state)}
          className={`${BASE} ${props.active === tab.state ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {`${tab.label} (${props.counts[tab.state] ?? 0})`}
        </button>
      ))}
    </div>
  );
}
