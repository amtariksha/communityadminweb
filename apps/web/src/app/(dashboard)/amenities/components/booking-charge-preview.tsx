'use client';

import type { ReactNode } from 'react';
import { useAmenityQuote, type QuoteRequest } from '@/hooks';
import { ApiError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';

/**
 * AMEN-01 — the charge a booking will carry, computed by the API from the
 * amenity's charging basis (hours × rate, days × rate, the slot rate or
 * nothing), shown before the admin presses Reserve.
 */

interface BookingChargePreviewProps {
  amenityId: string;
  request: QuoteRequest;
}

const UNIT_LABEL: Record<string, string> = { hour: 'hour', day: 'day', slot: 'slot' };

function basisLine(quantity: string, unit: string | null, rate: string): string {
  if (!unit) return 'Free amenity';
  const label = UNIT_LABEL[unit] ?? unit;
  const plural = quantity === '1' ? label : `${label}s`;
  return `${quantity} ${plural} × ${formatCurrency(Number(rate))}`;
}

export function BookingChargePreview({ amenityId, request }: BookingChargePreviewProps): ReactNode {
  const quote = useAmenityQuote(amenityId, request);

  if (!amenityId) return null;
  if (quote.isLoading) {
    return <p className="text-sm text-muted-foreground">Working out the charge…</p>;
  }
  if (quote.error) {
    const notYet = quote.error instanceof ApiError && quote.error.status === 404;
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {notYet
          ? 'The charge preview is not available yet. The booking is still billed by the amenity’s pricing.'
          : 'Could not work out the charge for these times.'}
      </p>
    );
  }
  if (!quote.data) return null;

  const { amount, deposit_amount: deposit, total, quantity, unit, rate } = quote.data;
  const hasDeposit = Number(deposit) > 0;
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm" data-testid="booking-charge">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{basisLine(quantity, unit, rate)}</span>
        <span>{formatCurrency(Number(amount))}</span>
      </div>
      {hasDeposit && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Security deposit</span>
          <span>{formatCurrency(Number(deposit))}</span>
        </div>
      )}
      {(quote.data.addons ?? []).map((addon) => (
        <div key={addon.addon_id} className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {addon.name} × {addon.quantity}
          </span>
          <span>{formatCurrency(Number(addon.amount))}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between font-medium">
        <span>{Number(total) > 0 ? 'Invoiced to the resident' : 'No charge'}</span>
        <span>{formatCurrency(Number(total))}</span>
      </div>
    </div>
  );
}
