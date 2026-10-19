'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { AnnouncementFilters } from '@/hooks';
import { CLASSIFICATION_LABELS, RECIPIENT_CHOICES } from '../_parts/labels';

type PanelFilters = Pick<AnnouncementFilters, 'posted_from' | 'posted_to' | 'classification' | 'audience'>;

/** The Retired Filter panel (ANN-S4): Posted On from / to · Type · Recipients, applied on Filter. */
export function useRetiredFilters() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PanelFilters>({});
  const [applied, setApplied] = useState<PanelFilters>({});
  return {
    open,
    toggle: () => setOpen((value) => !value),
    draft,
    change: (patch: PanelFilters) => setDraft((current) => ({ ...current, ...patch })),
    apply: () => setApplied(Object.fromEntries(Object.entries(draft).filter(([, value]) => value)) as PanelFilters),
    clear: () => {
      setDraft({});
      setApplied({});
    },
    applied,
  };
}

const AUDIENCES = RECIPIENT_CHOICES.filter((choice) => !choice.byBlock && !choice.standardOnly);

export function RetiredFilterPanel({ panel }: { panel: ReturnType<typeof useRetiredFilters> }): ReactNode {
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={panel.toggle} aria-expanded={panel.open}>
        Filter
      </Button>
      {panel.open && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="retired-from">Posted On from</Label>
            <Input id="retired-from" type="date" value={panel.draft.posted_from ?? ''} onChange={(e) => panel.change({ posted_from: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="retired-to">to</Label>
            <Input id="retired-to" type="date" value={panel.draft.posted_to ?? ''} onChange={(e) => panel.change({ posted_to: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="retired-type">Type</Label>
            <Select id="retired-type" value={panel.draft.classification ?? ''}
              onChange={(e) => panel.change({ classification: (e.target.value || undefined) as PanelFilters['classification'] })}>
              <option value="">All</option>
              <option value="official">{CLASSIFICATION_LABELS.official}</option>
              <option value="promotional">{CLASSIFICATION_LABELS.promotional}</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="retired-recipients">Recipients</Label>
            <Select id="retired-recipients" value={panel.draft.audience ?? ''} onChange={(e) => panel.change({ audience: e.target.value || undefined })}>
              <option value="">All</option>
              {AUDIENCES.map((choice) => <option key={choice.value} value={choice.audience}>{choice.label}</option>)}
            </Select>
          </div>
          <Button type="button" onClick={panel.apply}>Apply</Button>
          <Button type="button" variant="ghost" onClick={panel.clear}>Clear</Button>
        </div>
      )}
    </div>
  );
}
