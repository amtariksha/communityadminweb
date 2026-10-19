'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchCriteriaError, type FetchCriteria, type FetchRangeKind } from './fetch-criteria';

export interface FetchChoice {
  value: string;
  label: string;
}

export interface FetchPanelProps {
  /** Names the panel, e.g. "Fetch receipts". */
  title: string;
  range: FetchRangeKind;
  // "Date" or e.g. "Receipt No."; labels read "<rangeLabel> from / to".
  rangeLabel?: string;
  choices?: readonly FetchChoice[];
  initial?: Partial<FetchCriteria>;
  requireRange?: boolean;
  busy?: boolean;
  onFetch: (criteria: FetchCriteria) => void;
}

function RangeInputs({ props, criteria, set }: {
  props: FetchPanelProps;
  criteria: FetchCriteria;
  set: (patch: Partial<FetchCriteria>) => void;
}): ReactNode {
  const label = props.rangeLabel ?? (props.range === 'date' ? 'Date' : 'Number');
  const type = props.range === 'date' ? 'date' : 'text';
  const inputMode = props.range === 'number' ? 'numeric' : undefined;
  return (
    <>
      {(['from', 'to'] as const).map((end) => (
        <div key={end} className="space-y-1">
          <Label htmlFor={`fetch-${end}`}>{`${label} ${end}`}</Label>
          <Input
            id={`fetch-${end}`}
            type={type}
            inputMode={inputMode}
            className="w-40"
            value={criteria[end]}
            onChange={(event) => set({ [end]: event.target.value })}
          />
        </div>
      ))}
    </>
  );
}

/**
 * Fetch panel (requirements SB-09): a classic register opens empty and
 * loads only when the range and choice are set and Fetch is pressed. Pass
 * it to DataTable as `fetchMode.panel`; the standard layout keeps its live
 * filters and does not use it.
 */
export function FetchPanel(props: FetchPanelProps): ReactNode {
  const [criteria, setCriteria] = useState<FetchCriteria>({
    from: props.initial?.from ?? '',
    to: props.initial?.to ?? '',
    choice: props.initial?.choice ?? props.choices?.[0]?.value ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<FetchCriteria>): void => {
    setCriteria((current) => ({ ...current, ...patch }));
    setError(null);
  };

  function submit(): void {
    const problem = fetchCriteriaError(criteria, { range: props.range, requireRange: props.requireRange });
    setError(problem);
    if (!problem) props.onFetch({ ...criteria, from: criteria.from.trim(), to: criteria.to.trim() });
  }

  return (
    <form
      aria-label={props.title}
      className="space-y-2 rounded-md border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <RangeInputs props={props} criteria={criteria} set={set} />
        {props.choices && props.choices.length > 0 && (
          <fieldset className="flex flex-wrap items-center gap-3">
            <legend className="sr-only">Show</legend>
            {props.choices.map((choice) => (
              <label key={choice.value} className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={`${props.title}-choice`}
                  value={choice.value}
                  checked={criteria.choice === choice.value}
                  onChange={() => set({ choice: choice.value })}
                />
                {choice.label}
              </label>
            ))}
          </fieldset>
        )}
        <Button type="submit" disabled={props.busy}>
          {props.busy ? 'Fetching…' : 'Fetch'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
