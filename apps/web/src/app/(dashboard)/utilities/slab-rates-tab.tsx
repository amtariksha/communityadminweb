'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useMeterRules, type MeterRule } from '@/hooks/use-meter-rules';
import { todayIST } from '@/lib/date';
import { isNotDeployed } from '@/lib/not-deployed';
import { LegacySlabsTab } from './legacy-slabs-tab';
import { MeterRuleCard } from './setup/rules/rule-card';
import { MeterRuleForm } from './setup/rules/rule-form';

type Editing = { kind: 'new' } | { kind: 'edit'; rule: MeterRule } | null;

/**
 * Standard Slab Rates tab (UTIL-13): the meter rules, slabs grouped by
 * rule, with Add Meter Rule and Edit (a new version from a date) as
 * dialogs; earlier versions on request. An API without meter rules keeps
 * the old one-slab-at-a-time tab.
 */
export function SlabRatesTab(): ReactNode {
  const access = useFinanceAccess();
  const [history, setHistory] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const query = useMeterRules(history);

  if (isNotDeployed(query.error)) return <LegacySlabsTab />;
  const rules = query.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />
          Show earlier versions
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/utilities/setup/interest" className="text-sm text-primary hover:underline">
            Late payment interest — utilities
          </Link>
          {access.canWrite && (
            <Button onClick={() => setEditing({ kind: 'new' })}>
              <Plus className="mr-2 h-4 w-4" /> Add Meter Rule
            </Button>
          )}
        </div>
      </div>
      {query.isLoading && <Skeleton className="h-40 w-full" />}
      {!query.isLoading && rules.length === 0 && (
        <p className="text-sm text-muted-foreground">No meter rules yet — add one to calculate bills.</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {rules.map((rule) => (
          <MeterRuleCard key={rule.id} rule={rule} onEdit={access.canWrite ? (r) => setEditing({ kind: 'edit', rule: r }) : undefined} />
        ))}
      </div>
      {editing && (
        <MeterRuleForm
          key={editing.kind === 'edit' ? editing.rule.id : 'new'}
          mode="dialog"
          open
          rule={editing.kind === 'edit' ? editing.rule : undefined}
          today={todayIST()}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </div>
  );
}
