'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useMeterRules } from '@/hooks/use-meter-rules';
import { useUtilitySettings } from '@/hooks/use-utility-settings';
import { useAdminLayout } from '@/lib/layout-context';
import { isNotDeployed } from '@/lib/not-deployed';
import { MeterRuleCard } from './rules/rule-card';
import { AutoPostCard, ExcludedBanksCard, SimpleInterestCard } from './setup-cards';

function RuleCards({ canWrite }: { canWrite: boolean }): ReactNode {
  const router = useRouter();
  const query = useMeterRules(false);
  if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">Meter rules are not available yet on this server.</p>;
  if (query.isLoading) return <Skeleton className="h-32 w-full" />;
  const rules = query.data ?? [];
  if (rules.length === 0) return <p className="text-sm text-muted-foreground">No meter rules yet — add one to calculate bills.</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rules.map((rule) => (
        <MeterRuleCard key={rule.id} rule={rule} onEdit={canWrite ? (r) => router.push(`/utilities/setup/rules/${r.id}/edit`) : undefined} />
      ))}
    </div>
  );
}

/**
 * Utility Tracker › Setup (UTIL-S1): the meter rules read-only with Edit,
 * the utility interest rule, the accounts left out of utility payment
 * instructions, and links to Batch Posting and Utility Income. No Show
 * Logs here; the Edit pages have theirs.
 */
export function UtilitySetupContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const access = useFinanceAccess();
  const settings = useUtilitySettings();
  return (
    <div className="space-y-6">
      {!classic && <PageHeader title="Utility Tracker Setup" description="Meter rules, utility interest and payment instructions." />}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/utilities/bulk-posting" className="text-primary hover:underline">Batch Posting</Link>
        <Link href="/utilities/income" className="text-primary hover:underline">Income</Link>
      </div>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Configure Meter Slab Rates</h3>
          {access.canWrite && (
            <Link href="/utilities/setup/rules/new" className={buttonVariants({ size: 'sm' })}>
              Add Meter Rule
            </Link>
          )}
        </div>
        <RuleCards canWrite={access.canWrite} />
      </section>
      {isNotDeployed(settings.error) && <p className="text-sm text-muted-foreground">Utility settings are not available yet on this server.</p>}
      {settings.data && (
        <>
          <SimpleInterestCard view={settings.data} />
          <ExcludedBanksCard view={settings.data} canWrite={access.canWrite} />
          <AutoPostCard view={settings.data} canWrite={access.canWrite} />
        </>
      )}
    </div>
  );
}
