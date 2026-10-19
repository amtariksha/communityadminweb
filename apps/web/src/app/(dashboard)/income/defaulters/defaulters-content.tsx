'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { useDefaulterList, type DefaulterFilters } from '@/hooks/use-defaulters';
import { useTenant } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canWriteFinance } from '@/lib/finance-roles';
import { currentRole } from '@/lib/current-role';
import { useAdminLayout } from '@/lib/layout-context';
import { cn } from '@/lib/utils';
import { DefaultersFilters } from './defaulters-filters';
import { DefaultersTable } from './defaulters-table';
import { ReminderComposer } from './reminder-composer';
import { composerDefaults, type SavedReminderTemplate } from './reminder-template';

const VIEWS = [
  { view: 'invoices', label: 'Invoices', hint: 'Dues on invoices' },
  { view: 'other', label: 'Other', hint: 'Opening balances and debit notes' },
] as const;

function ViewLinks({ view }: { view: DefaulterFilters['view'] }): ReactNode {
  return (
    <nav aria-label="Dues" className="flex flex-wrap items-center gap-4 text-sm">
      {VIEWS.map((v) => (
        <Link key={v.view} href={`/income/defaulters?view=${v.view}`} title={v.hint} aria-current={view === v.view ? 'page' : undefined} className={cn('underline-offset-4 hover:underline', view === v.view && 'font-semibold underline')}>
          {v.label}
        </Link>
      ))}
      <Link href="/income/setup/defaulters" className="ml-auto text-muted-foreground underline-offset-4 hover:underline">
        Setup › Defaulters
      </Link>
      <Link href="/income/setup/defaulters#reminder-log" className="text-muted-foreground underline-offset-4 hover:underline">
        Log
      </Link>
    </nav>
  );
}

/** Income Tracker › Defaulters (INC-S29, INC-29): filter, pick, remind. Both layouts. */
export function DefaultersContent(): ReactNode {
  const searchParams = useSearchParams();
  const view: DefaulterFilters['view'] = searchParams?.get('view') === 'other' ? 'other' : 'invoices';
  const classic = useAdminLayout() === 'classic';
  const canWrite = useMemo(() => canWriteFinance(currentRole()), []);
  const [criteria, setCriteria] = useState<Omit<DefaulterFilters, 'view'>>({});
  const filters: DefaulterFilters = { ...criteria, view };
  const list = useDefaulterList(filters);
  const rows = list.data ?? [];
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const tenant = useTenant(getCurrentTenant() ?? '');
  const settings = tenant.data?.settings_json as Record<string, { template?: SavedReminderTemplate }> | undefined;
  const initial = composerDefaults(settings?.billing_reminders?.template, tenant.data?.name ?? '');

  const toggle = useCallback((unitId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      {!classic && <PageHeader title="Defaulters" description="Units with a bill open past its due date. Pick units and send them a reminder." />}
      <ViewLinks view={view} />
      <DefaultersFilters onApply={(next) => setCriteria((prev) => ({ ...next, q: prev.q }))} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set(rows.map((r) => r.unit_id)))} disabled={rows.length === 0}>
          Select All
        </Button>
        {selected.size > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear selection ({selected.size})
          </Button>
        )}
      </div>
      <DefaultersTable
        rows={rows}
        filters={filters}
        selected={selected}
        onToggle={toggle}
        onSearch={(q) => setCriteria((prev) => ({ ...prev, q }))}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
      />
      {tenant.data && <ReminderComposer key={tenant.data.id} unitIds={[...selected]} initial={initial} canSend={canWrite} />}
    </div>
  );
}
