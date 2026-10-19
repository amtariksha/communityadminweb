'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormMode } from '@/components/form-page';
import { useBillingRules, type RuleLine, type RuleTypeGroup } from '@/hooks/use-billing-rules';
import { ApiError, friendlyError } from '@/lib/api-error';
import { EndLineControl } from './end-line-control';
import { RuleLineForm } from './rule-line-form';
import { RuleTypeTable } from './rule-type-table';

export const AUTO_INVOICING_HREF = '/income/setup/auto-invoicing';
export const addLineHref = (categoryId: string): string => `${AUTO_INVOICING_HREF}/${categoryId}/lines/new`;
export const reviseLineHref = (lineId: string): string => `${AUTO_INVOICING_HREF}/lines/${lineId}/revise`;

type Editing = { group: RuleTypeGroup; line?: RuleLine } | null;

function Empty(): ReactNode {
  return (
    <p className="text-sm text-muted-foreground">
      No unit types yet. Add them under{' '}
      <Link href="/settings#unit-types" className="underline">
        Unit types
      </Link>
      , then add the line items each type is billed.
    </p>
  );
}

/**
 * The rule tables of Setup › Auto Invoicing (INC-S1), one per unit type.
 * Add / Edit Line Item open a dialog in the standard layout and their own
 * page in classic (SB-07).
 */
export function RuleBook({ canWrite, actions }: { canWrite: boolean; actions?: (group: RuleTypeGroup) => ReactNode }): ReactNode {
  const query = useBillingRules();
  const mode = useFormMode();
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);

  function open(group: RuleTypeGroup, line?: RuleLine): void {
    if (mode === 'page') router.push(line ? reviseLineHref(line.id) : addLineHref(group.category.id));
    else setEditing({ group, line });
  }

  function body(): ReactNode {
    if (query.isLoading) return <Skeleton className="h-32 w-full" />;
    if (query.isError) {
      if (query.error instanceof ApiError && query.error.status === 404) {
        return <p className="text-sm text-muted-foreground">Rule lines are not available yet on this server.</p>;
      }
      return <p className="text-sm text-destructive">Could not load the rules: {friendlyError(query.error)}</p>;
    }
    const groups = query.data?.data ?? [];
    if (groups.length === 0) return <Empty />;
    return groups.map((group) => (
      <RuleTypeTable
        key={group.category.id}
        group={group}
        canWrite={canWrite}
        onAdd={() => open(group)}
        onRevise={(line) => open(group, line)}
        actions={actions?.(group)}
      />
    ));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rules per unit type</CardTitle>
        <p className="text-xs text-muted-foreground">
          Each line bills (Fee / Sq.ft 1 × Sq.ft 1 + Fee / Sq.ft 2 × Sq.ft 2 + Unit Fee) a month. Edit Line Item saves a new version from its date; issued invoices are never changed.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">{body()}</CardContent>
      {editing && (
        <RuleLineForm
          key={editing.line?.id ?? editing.group.category.id}
          mode="dialog"
          open
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
          category={editing.group.category}
          line={editing.line}
          footer={editing.line && <EndLineControl line={editing.line} onEnded={() => setEditing(null)} />}
        />
      )}
    </Card>
  );
}
