'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { useDefaulterList, type DefaulterFilters, type DefaulterScope } from '@/hooks/use-defaulters';
import { useTenant } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canWriteFinance } from '@/lib/finance-roles';
import { currentRole } from '@/lib/current-role';
import { useAdminLayout } from '@/lib/layout-context';
import { cn } from '@/lib/utils';
import { DefaultersFilters } from './defaulters-filters';
import { DefaultersTable } from './defaulters-table';
import { ReminderComposer, type ComposerValues } from './reminder-composer';
import { composerDefaults, type SavedReminderTemplate } from './reminder-template';

const VIEWS = [
  { view: 'invoices', label: 'Invoices', hint: 'Dues on invoices' },
  { view: 'other', label: 'Other', hint: 'Opening balances and debit notes' },
] as const;

/** Where a Defaulters page lives and links to: Income Tracker's by default, Utility Tracker's for utility dues (UTIL-09). */
export interface DefaultersPlace {
  title: string;
  basePath: string;
  setupHref: string;
  logHref: string;
}

const INCOME_DEFAULTERS: DefaultersPlace = {
  title: 'Defaulters',
  basePath: '/income/defaulters',
  setupHref: '/income/setup/defaulters',
  logHref: '/income/setup/defaulters#reminder-log',
};

function ViewLinks({ view, place }: { view: DefaulterFilters['view']; place: DefaultersPlace }): ReactNode {
  return (
    <nav aria-label="Dues" className="flex flex-wrap items-center gap-4 text-sm">
      {VIEWS.map((v) => (
        <Link key={v.view} href={`${place.basePath}?view=${v.view}`} title={v.hint} aria-current={view === v.view ? 'page' : undefined} className={cn('underline-offset-4 hover:underline', view === v.view && 'font-semibold underline')}>
          {v.label}
        </Link>
      ))}
      <Link href={place.setupHref} className="ml-auto text-muted-foreground underline-offset-4 hover:underline">
        Setup › Defaulters
      </Link>
      <Link href={place.logHref} className="text-muted-foreground underline-offset-4 hover:underline">
        Log
      </Link>
    </nav>
  );
}

interface DefaultersContentProps {
  /** Maintenance dues (Income Tracker, default) or utility dues (Utility Tracker, UTIL-09). */
  scope?: DefaulterScope;
  place?: DefaultersPlace;
  /** The composer's starting text; unset = the saved maintenance text, else ours. */
  composerText?: ComposerValues | null;
  /** Why the composer cannot send on this server, if it cannot. */
  sendUnavailable?: string | null;
}

/** Income Tracker › Defaulters (INC-S29, INC-29): filter, pick, remind. Both layouts. */
export function DefaultersContent({ scope = 'member', place = INCOME_DEFAULTERS, composerText, sendUnavailable }: DefaultersContentProps = {}): ReactNode {
  const searchParams = useSearchParams();
  const view: DefaulterFilters['view'] = searchParams?.get('view') === 'other' ? 'other' : 'invoices';
  const classic = useAdminLayout() === 'classic';
  const canWrite = useMemo(() => canWriteFinance(currentRole()), []);
  const [criteria, setCriteria] = useState<Omit<DefaulterFilters, 'view'>>({});
  // UTIL-09 — each Defaulters page lists its own ledger only.
  const filters: DefaulterFilters = { ...criteria, view, scope };
  const list = useDefaulterList(filters);
  const rows = list.data ?? [];
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const tenant = useTenant(getCurrentTenant() ?? '');
  const settings = tenant.data?.settings_json as Record<string, { template?: SavedReminderTemplate }> | undefined;
  const initial = composerText ?? composerDefaults(settings?.billing_reminders?.template, tenant.data?.name ?? '');

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
      {!classic && <PageHeader title={place.title} description="Units with a bill open past its due date. Pick units and send them a reminder." />}
      <ViewLinks view={view} place={place} />
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
      {tenant.data && (
        <ReminderComposer
          key={`${tenant.data.id}:${JSON.stringify(initial)}`}
          unitIds={[...selected]}
          initial={initial}
          canSend={canWrite}
          scope={scope}
          unavailable={sendUnavailable}
        />
      )}
    </div>
  );
}
