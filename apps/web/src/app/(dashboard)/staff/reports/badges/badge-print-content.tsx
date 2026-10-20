'use client';

import { useState, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useBadgeSheet, type BadgeSheetFilters } from '@/hooks/use-staff-badges';
import { printHtml } from '@/lib/download';
import { isRouteMissing } from '@/lib/not-deployed';
import { BADGE_SHEET_STYLE, BadgeSheet, type BadgeSheetVariant } from '../badge-sheet';

const VARIANTS: ReadonlyArray<{ value: BadgeSheetVariant; label: string }> = [
  { value: 'badges', label: 'Staff Badges' },
  { value: 'badges_units_qr', label: 'Staff Badges - With Unit Nos & QR Code' },
  { value: 'qr', label: 'Staff QR' },
  { value: 'back', label: 'Badge back side' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'temp', label: 'Temp' },
  { value: '', label: 'All' },
];

/** Staff Manager › Reports › Print badges (STAFF-31): the cards with header image, photos and QR, printed on A4. */
export function BadgePrintContent(): ReactNode {
  const [filters, setFilters] = useState<BadgeSheetFilters>({ status: 'active', category: '', badge_from: '', badge_to: '' });
  const [variant, setVariant] = useState<BadgeSheetVariant>('badges');
  const sheet = useBadgeSheet(filters);
  const change = (patch: Partial<BadgeSheetFilters>) => setFilters((current) => ({ ...current, ...patch }));
  if (isRouteMissing(sheet.error)) return <p className="text-sm text-muted-foreground">Badge printing is not available yet on this server.</p>;
  const print = () => {
    if (!sheet.data) return;
    const body = renderToStaticMarkup(<BadgeSheet sheet={sheet.data} variant={variant} />);
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Staff badges</title><style>body{margin:8mm}${BADGE_SHEET_STYLE}</style></head><body>${body}</body></html>`);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="badge-variant">Print</Label>
          <Select id="badge-variant" value={variant} onChange={(event) => setVariant(event.target.value as BadgeSheetVariant)}>
            {VARIANTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="badge-status">Status</Label>
          <Select id="badge-status" value={filters.status} onChange={(event) => change({ status: event.target.value })}>
            {STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="badge-from">Badge No. from</Label>
          <Input id="badge-from" inputMode="numeric" value={filters.badge_from} onChange={(event) => change({ badge_from: event.target.value })} className="w-28" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="badge-to">to</Label>
          <Input id="badge-to" inputMode="numeric" value={filters.badge_to} onChange={(event) => change({ badge_to: event.target.value })} className="w-28" />
        </div>
        <Button type="button" disabled={!sheet.data || sheet.data.cards.length === 0} onClick={print}>
          Print ({sheet.data?.cards.length ?? 0})
        </Button>
      </div>
      {sheet.data && sheet.data.cards.length === 0 && <p className="text-sm text-muted-foreground">No badges match.</p>}
      {sheet.data && (
        <div className="overflow-x-auto rounded-md border p-3">
          <style>{BADGE_SHEET_STYLE}</style>
          <BadgeSheet sheet={sheet.data} variant={variant} />
        </div>
      )}
    </div>
  );
}
