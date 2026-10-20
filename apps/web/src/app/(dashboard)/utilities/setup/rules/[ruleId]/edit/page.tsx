'use client';

import { type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShowLogsButton } from '@/components/show-logs';
import { Skeleton } from '@/components/ui/skeleton';
import { useMeterRules } from '@/hooks/use-meter-rules';
import { todayIST } from '@/lib/date';
import { useAdminLayout } from '@/lib/layout-context';
import { isNotDeployed } from '@/lib/not-deployed';
import { MeterRuleForm } from '../../rule-form';

// Utility Tracker › Setup › Edit meter rule (UTIL-S2, UTIL-13): a new version from a date, with its logs.
export default function EditMeterRulePage(): ReactNode {
  const { ruleId } = useParams<{ ruleId: string }>();
  const router = useRouter();
  const classic = useAdminLayout() === 'classic';
  const query = useMeterRules(true);
  const back = (): void => router.push(classic ? '/utilities/setup' : '/utilities');

  if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">Meter rules are not available yet on this server.</p>;
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  const rule = query.data?.find((r) => r.id === ruleId);
  if (!rule) return <p className="text-sm text-muted-foreground">This meter rule was not found.</p>;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ShowLogsButton recordTypes={['utility_meter_rule']} />
      </div>
      {rule.effective_to === null ? (
        <MeterRuleForm mode="page" rule={rule} today={todayIST()} onClose={back} onSaved={back} />
      ) : (
        <p className="text-sm text-muted-foreground">This version ended on {rule.effective_to}; edit the latest version of the rule.</p>
      )}
    </div>
  );
}
