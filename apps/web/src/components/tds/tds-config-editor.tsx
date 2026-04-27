'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TdsConfig, TdsSection } from '@/hooks';

// ---------------------------------------------------------------------------
// Editor for the TDS config object.
//
// Used in two places:
//   1. Super-admin → Platform Settings → "Tax Defaults" tab. Edits the
//      platform-wide default that every tenant inherits unless they
//      override.
//   2. Community-admin → Settings → "TDS Configuration" card. Edits
//      the per-tenant override; "Reset to platform default" wipes the
//      override.
//
// Both surfaces re-use this component with different save handlers.
// The component is purely controlled — it never persists; the parent
// owns the mutation. That keeps the same form usable for either save
// path without coupling to a specific hook.
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: TdsConfig = {
  enabled: true,
  default_threshold: 30000,
  default_rate: 10,
  sections: [],
};

export interface TdsConfigEditorProps {
  /** Current value to render. Pass `null` to start from defaults. */
  value: TdsConfig | null;
  /** Called when the operator clicks Save. */
  onSave: (config: TdsConfig) => void;
  /**
   * Optional reset handler. When provided, a "Reset to platform
   * default" button is shown. Only meaningful for community-admin
   * usage where the override can be cleared.
   */
  onReset?: () => void;
  /** Disable the form while a mutation is pending. */
  isPending?: boolean;
  /** Whether a "Reset" mutation is pending (separate spinner). */
  isResetPending?: boolean;
  /**
   * Tag rendered above the form indicating where the current values
   * came from. e.g. "Using platform default" / "Custom for this society".
   */
  sourceLabel?: string;
}

export function TdsConfigEditor({
  value,
  onSave,
  onReset,
  isPending = false,
  isResetPending = false,
  sourceLabel,
}: TdsConfigEditorProps): ReactNode {
  const initial = useMemo<TdsConfig>(
    () => normalize(value ?? DEFAULT_CONFIG),
    [value],
  );

  const [enabled, setEnabled] = useState<boolean>(initial.enabled);
  const [defaultThreshold, setDefaultThreshold] = useState<string>(
    String(initial.default_threshold),
  );
  const [defaultRate, setDefaultRate] = useState<string>(
    String(initial.default_rate),
  );
  const [sections, setSections] = useState<TdsSection[]>(initial.sections);

  // Re-sync when the upstream value changes (e.g. parent refetch after
  // a save). Without this, hitting Save and then re-opening the page
  // showed the form with stale local state from before the save.
  useEffect(() => {
    setEnabled(initial.enabled);
    setDefaultThreshold(String(initial.default_threshold));
    setDefaultRate(String(initial.default_rate));
    setSections(initial.sections);
  }, [initial]);

  function updateSection(index: number, patch: Partial<TdsSection>): void {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function removeSection(index: number): void {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function addSection(): void {
    setSections((prev) => [
      ...prev,
      { code: '', label: '', threshold: 0, rate: 0 },
    ]);
  }

  function handleSave(): void {
    const cleaned: TdsConfig = {
      enabled,
      default_threshold: parseNum(defaultThreshold, 0),
      default_rate: parseNum(defaultRate, 0),
      sections: sections
        .map((s) => ({
          code: s.code.trim().toUpperCase(),
          label: s.label.trim(),
          threshold: parseNum(s.threshold, 0),
          rate: parseNum(s.rate, 0),
        }))
        .filter((s) => s.code.length > 0),
    };
    onSave(cleaned);
  }

  return (
    <div className="space-y-6">
      {sourceLabel && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          {sourceLabel}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id="tds-enabled"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4"
          disabled={isPending}
        />
        <Label htmlFor="tds-enabled" className="cursor-pointer">
          Auto-suggest TDS deductions on vendor bills
        </Label>
      </div>
      <p className="-mt-4 text-xs text-muted-foreground">
        When enabled, the bill / convert-PR dialog auto-fills the TDS
        amount from the rules below. The operator can still override
        before saving.
      </p>

      {/* Defaults — used when a vendor has no tds_section or the
          section isn't listed below. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Default threshold (₹)</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={defaultThreshold}
            onChange={(e) => setDefaultThreshold(e.target.value)}
            disabled={!enabled || isPending}
          />
          <p className="text-xs text-muted-foreground">
            Bills below this amount don&apos;t attract TDS.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Default TDS rate (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={defaultRate}
            onChange={(e) => setDefaultRate(e.target.value)}
            disabled={!enabled || isPending}
          />
          <p className="text-xs text-muted-foreground">
            Used when the vendor has no specific section.
          </p>
        </div>
      </div>

      {/* Per-section overrides */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Section-wise rules</h4>
            <p className="text-xs text-muted-foreground">
              Map IT-Act sections (194C, 194J, 194I, …) to their threshold
              and rate. Vendors carry a <code>tds_section</code> field;
              the matching row here governs the suggestion.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSection}
            disabled={!enabled || isPending}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add section
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Section</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[140px]">Threshold (₹)</TableHead>
              <TableHead className="w-[120px]">Rate (%)</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-sm text-muted-foreground"
                >
                  No section rules. Add one to override the default rate
                  for a specific TDS section.
                </TableCell>
              </TableRow>
            )}
            {sections.map((s, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Input
                    value={s.code}
                    onChange={(e) => updateSection(i, { code: e.target.value })}
                    placeholder="194C"
                    disabled={!enabled || isPending}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={s.label}
                    onChange={(e) =>
                      updateSection(i, { label: e.target.value })
                    }
                    placeholder="Contractor / Sub-contractor"
                    disabled={!enabled || isPending}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={String(s.threshold)}
                    onChange={(e) =>
                      updateSection(i, {
                        threshold: parseNum(e.target.value, 0),
                      })
                    }
                    disabled={!enabled || isPending}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={String(s.rate)}
                    onChange={(e) =>
                      updateSection(i, { rate: parseNum(e.target.value, 0) })
                    }
                    disabled={!enabled || isPending}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSection(i)}
                    disabled={isPending}
                    aria-label="Remove section"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2 pt-4">
        {onReset ? (
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            disabled={isResetPending || isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {isResetPending ? 'Resetting…' : 'Reset to platform default'}
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseNum(v: string | number, fallback: number): number {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalize(input: TdsConfig): TdsConfig {
  return {
    enabled: input.enabled !== false,
    default_threshold: Number(input.default_threshold ?? 0),
    default_rate: Number(input.default_rate ?? 0),
    sections: Array.isArray(input.sections)
      ? input.sections.map((s) => ({
          code: String(s.code ?? '').trim(),
          label: String(s.label ?? ''),
          threshold: Number(s.threshold ?? 0),
          rate: Number(s.rate ?? 0),
        }))
      : [],
  };
}
