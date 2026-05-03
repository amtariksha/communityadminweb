'use client';

import { useMemo, type ReactNode } from 'react';
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
 *
 * RENDER INVARIANT: this component MUST always produce at least one
 * `<option>` child. Production has shown the dropdown rendering
 * "No options" intermittently (Create Bill dialog under Purchases,
 * 2026-05-02) — that screen is a hard blocker because the user
 * can't submit. Three layers of defense below; if all fail at once
 * it's a real React Query bug worth filing upstream:
 *
 *   1. `useTaxRates` declares `placeholderData: { gst: FALLBACK_GST }`
 *      so `data` is non-undefined from the very first render.
 *   2. `useTaxRates#queryFn` wraps the API call in try/catch and
 *      returns FALLBACK_GST on either an empty server response or
 *      a thrown ApiError.
 *   3. (Here) `useMemo` coalesces `data?.gst ?? COMPONENT_FALLBACK_GST`
 *      and explicitly drops empty arrays before they reach JSX.
 *
 * Also: the previous version branched on `isLoading` and rendered
 * a single "Loading rates…" option during the loading state. With
 * React Query v5 + placeholderData, `isLoading` is FALSE on first
 * paint (data is already populated), so that branch was dead code
 * AND a footgun — if a future refactor accidentally returns
 * `data === undefined` from the hook, the loading-text branch
 * would never fire and the fragment branch would render zero
 * options. Removing the branch makes the invariant impossible to
 * break.
 */
// Last-ditch defaults so the dropdown is NEVER empty even if both the
// hook's placeholderData AND queryFn fallback misfire (e.g. a
// regression that returns `{ gst: [] }` from a buggy server). Mirrors
// FALLBACK_GST in use-tax-rates.ts.
const COMPONENT_FALLBACK_GST: readonly number[] = [0, 5, 12, 18, 28];

export function GstRateSelect({
  id,
  value,
  onChange,
  required,
  allowNone = true,
  className,
}: GstRateSelectProps): ReactNode {
  const { data } = useTaxRates();

  // Coalesce to a guaranteed-non-empty array. Memoised because
  // re-renders are common (every parent form keystroke) and the
  // identity of `rates` would otherwise churn React Query's
  // placeholder reference. Three falsy paths funnel into the
  // canonical slabs:
  //   - data === undefined (hook never ran)
  //   - data.gst === undefined (response shape drift)
  //   - data.gst.length === 0 (server returned empty list)
  const rates = useMemo<readonly number[]>(() => {
    const fetched = data?.gst;
    if (Array.isArray(fetched) && fetched.length > 0) return fetched;
    return COMPONENT_FALLBACK_GST;
  }, [data?.gst]);

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
      {allowNone && <option value="">No GST (0%)</option>}
      {rates.map((r) => (
        <option key={r} value={String(r)}>
          {r}%
        </option>
      ))}
    </Select>
  );
}
