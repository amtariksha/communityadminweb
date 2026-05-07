'use client';

import { useMemo, type ReactNode } from 'react';
import { CheckCircle2, X, AlertCircle, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TallyDebtorParseResult } from '@/hooks/use-tally-import';

// FeatPlan — review table for AI-parsed Tally sundry-debtor rows.
// Used by:
//   • P1: the in-import Review Debtors step (correlates to a
//     committing import's preview, no ledger_id yet — keyed by
//     `name`).
//   • P2: the standalone /accounts/reconcile-debtors backfill
//     page (existing unlinked ledgers — keyed by `ledger_id`).
//
// Decisions are keyed by the row's unique correlation: ledger_id
// when present, falling back to name. The parent component owns
// the decision map (controlled component) so it can submit the
// shape its endpoint expects.

export interface DebtorRowDecision {
  action: 'approve' | 'skip';
  unit_id: string | null;
  unit_number: string;
  owners: string[];
}

export type DebtorDecisionMap = Record<string, DebtorRowDecision>;

interface DebtorReviewTableProps {
  rows: TallyDebtorParseResult[];
  decisions: DebtorDecisionMap;
  onChange: (next: DebtorDecisionMap) => void;
  /**
   * Optional — when present, "Pick existing unit" lets the admin
   * choose from this list. The parent fetches it via `useUnits()`.
   */
  existingUnits?: Array<{ id: string; unit_number: string }>;
  /** Disabled state for the whole table (e.g. while submitting). */
  disabled?: boolean;
}

/**
 * Resolve the unique key for a row. P2 backfill uses ledger_id;
 * P1 in-import uses the name (the ledger row hasn't been
 * committed yet, so no id).
 */
function rowKey(row: TallyDebtorParseResult): string {
  return row.ledger_id ?? row.name;
}

/**
 * Build a starter decision from the parser's output. Honours the
 * confidence: high-confidence rows default to `approve`,
 * everything else defaults to `skip` so the admin has to opt in
 * before creating units / members for noisy parses.
 */
export function defaultDecisionForRow(
  row: TallyDebtorParseResult,
): DebtorRowDecision {
  const highConfidence =
    row.parsed.confidence >= 0.7 &&
    !!row.parsed.unit_number &&
    row.parsed.owner_names.length > 0;
  return {
    action: highConfidence ? 'approve' : 'skip',
    unit_id: null,
    unit_number: row.parsed.unit_number ?? '',
    owners: [...row.parsed.owner_names],
  };
}

export function buildInitialDecisions(
  rows: TallyDebtorParseResult[],
): DebtorDecisionMap {
  const out: DebtorDecisionMap = {};
  for (const r of rows) {
    out[rowKey(r)] = defaultDecisionForRow(r);
  }
  return out;
}

/** Validate a single decision. Returns null when valid; otherwise an error msg. */
export function validateDecision(d: DebtorRowDecision): string | null {
  if (d.action === 'skip') return null;
  if (!d.unit_id && !d.unit_number.trim()) {
    return 'Pick a unit (existing or new) before approving.';
  }
  if (d.owners.length === 0 || d.owners.every((o) => !o.trim())) {
    return 'Add at least one owner name before approving.';
  }
  return null;
}

export function DebtorReviewTable({
  rows,
  decisions,
  onChange,
  existingUnits,
  disabled = false,
}: DebtorReviewTableProps): ReactNode {
  const unitsByNumber = useMemo(() => {
    const m = new Map<string, { id: string; unit_number: string }>();
    if (existingUnits) {
      for (const u of existingUnits) {
        m.set(u.unit_number.trim().toLowerCase(), u);
      }
    }
    return m;
  }, [existingUnits]);

  function update(key: string, patch: Partial<DebtorRowDecision>): void {
    const cur = decisions[key];
    if (!cur) return;
    onChange({ ...decisions, [key]: { ...cur, ...patch } });
  }

  function setAction(key: string, action: DebtorRowDecision['action']): void {
    update(key, { action });
  }

  function setUnitNumber(key: string, value: string): void {
    // Auto-link to an existing unit if the typed number matches.
    const existing = unitsByNumber.get(value.trim().toLowerCase());
    update(key, {
      unit_number: value,
      unit_id: existing ? existing.id : null,
    });
  }

  function setOwner(key: string, idx: number, value: string): void {
    const cur = decisions[key];
    if (!cur) return;
    const next = [...cur.owners];
    next[idx] = value;
    update(key, { owners: next });
  }

  function addOwner(key: string): void {
    const cur = decisions[key];
    if (!cur) return;
    update(key, { owners: [...cur.owners, ''] });
  }

  function removeOwner(key: string, idx: number): void {
    const cur = decisions[key];
    if (!cur) return;
    update(key, { owners: cur.owners.filter((_, i) => i !== idx) });
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%]">Ledger name</TableHead>
            <TableHead className="w-[18%]">Unit #</TableHead>
            <TableHead className="w-[34%]">Owners</TableHead>
            <TableHead className="w-[10%]">Confidence</TableHead>
            <TableHead className="w-[10%] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const key = rowKey(row);
            const d = decisions[key];
            if (!d) return null;
            const err = d.action === 'approve' ? validateDecision(d) : null;
            const matchedUnit = d.unit_id
              ? existingUnits?.find((u) => u.id === d.unit_id)
              : null;
            return (
              <TableRow key={key} className={d.action === 'skip' ? 'opacity-60' : ''}>
                <TableCell className="align-top">
                  <p className="font-medium text-sm break-words">{row.name}</p>
                  {row.parsed.confidence < 0.5 && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3" />
                      Low-confidence parse — verify before approving.
                    </p>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <Input
                    value={d.unit_number}
                    onChange={(e) => setUnitNumber(key, e.target.value)}
                    placeholder="e.g. 1001 or B-203"
                    disabled={disabled || d.action === 'skip'}
                    className="h-8 text-sm"
                    maxLength={50}
                  />
                  {matchedUnit && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Matches existing unit {matchedUnit.unit_number}
                    </p>
                  )}
                  {!matchedUnit && d.unit_number.trim() && d.action === 'approve' && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Plus className="h-3 w-3" />
                      Will be created as a new unit.
                    </p>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    {d.owners.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Input
                          value={name}
                          onChange={(e) => setOwner(key, idx, e.target.value)}
                          placeholder="Owner full name"
                          disabled={disabled || d.action === 'skip'}
                          className="h-8 text-sm"
                          maxLength={200}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOwner(key, idx)}
                          disabled={disabled || d.action === 'skip'}
                          aria-label="Remove owner"
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addOwner(key)}
                      disabled={disabled || d.action === 'skip'}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add owner
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge
                    variant={
                      row.parsed.confidence >= 0.85
                        ? 'success'
                        : row.parsed.confidence >= 0.5
                          ? 'secondary'
                          : 'warning'
                    }
                    className="font-mono"
                  >
                    {Math.round(row.parsed.confidence * 100)}%
                  </Badge>
                  {err && (
                    <p className="mt-1 text-xs text-destructive">{err}</p>
                  )}
                </TableCell>
                <TableCell className="align-top text-right">
                  <div className="inline-flex rounded-md border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAction(key, 'approve')}
                      disabled={disabled}
                      className={
                        'px-2 py-1 text-xs ' +
                        (d.action === 'approve'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted')
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction(key, 'skip')}
                      disabled={disabled}
                      className={
                        'px-2 py-1 text-xs border-l ' +
                        (d.action === 'skip'
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted')
                      }
                    >
                      Skip
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
