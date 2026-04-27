'use client';

import type { ReactNode } from 'react';
import { Select } from './select';
import { useTaxRates } from '@/hooks/use-tax-rates';

interface GstRateSelectProps {
  id?: string;
  /** Current selected rate, as a number. `null`/`undefined` = "No GST". */
  value: number | null | undefined;
  onChange: (rate: number | null) => void;
  required?: boolean;
  /**
   * When true, adds a leading "No GST" option that resolves to `null`.
   * Default true — most callers want to allow "no GST" as a valid value.
   */
  allowNone?: boolean;
  className?: string;
}

/**
 * Dropdown of GST slabs maintained centrally in platform_config.
 * Super-admin edits propagate to every page that renders this
 * component after the Redis cache TTL expires (5 min).
 *
 * Why a shared component: before this, every GST field was a free
 * number input. Nothing stopped a user from typing 17.3% or 99%;
 * invoices then failed downstream compliance checks. Locking the
 * entry surface to the canonical slabs fixes that at the source.
 */
// Last-ditch defaults so the dropdown is NEVER empty even if both the
// hook's placeholderData AND queryFn fallback misfire (e.g. a
// regression that returns `{ gst: [] }` from a buggy server). Mirrors
// FALLBACK_GST in use-tax-rates.ts.
const COMPONENT_FALLBACK_GST = [0, 5, 12, 18, 28];

export function GstRateSelect({
  id,
  value,
  onChange,
  required,
  allowNone = true,
  className,
}: GstRateSelectProps): ReactNode {
  const { data, isLoading } = useTaxRates();
  const fetchedRates = data?.gst ?? [];
  // Belt-and-suspenders: if the hook returned an empty list for any
  // reason, fall back to the canonical slabs. Empty dropdown is worse
  // than slightly-stale GST options — the operator can always pick
  // the right one.
  const rates = fetchedRates.length > 0 ? fetchedRates : COMPONENT_FALLBACK_GST;

  const stringValue = value == null ? '' : String(value);

  return (
    <Select
      id={id}
      required={required}
      className={className}
      value={stringValue}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '') onChange(null);
        else onChange(Number(v));
      }}
    >
      {isLoading ? (
        <option value="">Loading rates…</option>
      ) : (
        <>
          {allowNone && <option value="">No GST (0%)</option>}
          {rates.map((r) => (
            <option key={r} value={String(r)}>
              {r}%
            </option>
          ))}
        </>
      )}
    </Select>
  );
}
