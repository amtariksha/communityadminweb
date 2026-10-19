'use client';

import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { useBillingRules } from '@/hooks/use-billing-rules';
import { AUTO_INVOICING_HREF } from '../../../components/rule-book';
import { EndLineControl } from '../../../components/end-line-control';
import { RuleLineForm } from '../../../components/rule-line-form';

// Setup › Auto Invoicing › Edit Line Item ("Revise auto-invoice rule for unit type") as a page (classic, SB-07).
export default function ReviseRuleLinePage(): ReactNode {
  const { lineId } = useParams<{ lineId: string }>();
  const router = useRouter();
  const rules = useBillingRules({ history: true });
  const group = rules.data?.data.find((g) => g.lines.some((l) => l.id === lineId));
  const line = group?.lines.find((l) => l.id === lineId);
  if (rules.isLoading) return null;
  if (!group || !line) return <p className="text-sm text-muted-foreground">This line item was not found.</p>;
  const back = (): void => router.push(AUTO_INVOICING_HREF);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShowLogsButton recordTypes={['billing_rule_line']} />
      </div>
      <RuleLineForm mode="page" onClose={back} onSaved={back} category={group.category} line={line} />
      <EndLineControl line={line} onEnded={back} />
    </div>
  );
}
