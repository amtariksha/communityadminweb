'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/api-error';
import { indiaDateTime } from '@/lib/india-time';
import { useRotateBadgeQr, type BadgeCard } from '@/hooks/use-staff-badges';

/**
 * Release 4 — Rotate QR: a lost or copied card gets a new code; the printed
 * one stops working at the gate at once, and the sheet above prints the new
 * one. Shown only by an API that names each badge (older ones cannot rotate).
 */
export function BadgeQrCodes({ cards }: { cards: BadgeCard[] }): ReactNode {
  const rotatable = cards.filter((card): card is BadgeCard & { badge_id: string } => typeof card.badge_id === 'string');
  if (rotatable.length === 0) return null;
  return (
    <section className="space-y-2" aria-labelledby="badge-qr-codes">
      <h2 id="badge-qr-codes" className="text-sm font-semibold">QR codes</h2>
      <p className="text-sm text-muted-foreground">
        Issue a new QR when a card is lost or copied. The old card stops working at the gate straight away; print the new one.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Badge No.</th>
              <th className="p-2">Name</th>
              <th className="p-2">QR issued</th>
              <th className="p-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rotatable.map((card) => <QrRow key={card.badge_id} card={card} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QrRow({ card }: { card: BadgeCard & { badge_id: string } }): ReactNode {
  const rotate = useRotateBadgeQr();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onRotate(): Promise<void> {
    if (!window.confirm(`Issue a new QR for badge ${card.badge_no} (${card.name})? The card printed now stops working at the gate.`)) return;
    setError(null);
    try {
      await rotate.mutateAsync({ badgeId: card.badge_id });
      setDone(true);
    } catch (failure) {
      setError(friendlyError(failure));
    }
  }

  return (
    <tr className="border-t">
      <td className="p-2 tabular-nums">{card.badge_no}</td>
      <td className="p-2">{card.name}</td>
      <td className="p-2">{card.qr_rotated_at ? indiaDateTime(card.qr_rotated_at) : 'With the badge'}</td>
      <td className="p-2 text-right">
        <Button type="button" size="sm" variant="outline" disabled={rotate.isPending} onClick={() => void onRotate()}>
          {rotate.isPending ? 'Issuing…' : 'Issue new QR'}
        </Button>
        {done && !error && <span className="ml-2 text-xs text-muted-foreground">New QR issued — print the card again.</span>}
        {error && <span role="alert" className="ml-2 text-xs text-destructive">{error}</span>}
      </td>
    </tr>
  );
}
