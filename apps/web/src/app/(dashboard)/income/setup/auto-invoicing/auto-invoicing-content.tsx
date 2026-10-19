'use client';

import { useMemo, type ReactNode } from 'react';
import { BillingRunsPanel } from '../../../invoices/billing-runs-panel';
import { BillingRulesCard } from '../../../settings/billing-rules-card';
import { InterestCard } from '../../../settings/interest-card';
import { useAutoInvoiceSettings } from '@/hooks/use-billing-rules';
import { canWriteFinance } from '@/lib/finance-roles';
import { currentRole } from '@/lib/current-role';
import { AutoInvoiceForm } from './components/auto-invoice-form';
import { RuleBook } from './components/rule-book';
import { RunNowControl } from './components/run-now-control';

/**
 * Setup › Auto Invoicing (INC-S1, INC-17): the form, the rule lines per unit
 * type, late payment interest and the billing runs. The old society-wide
 * billing rules stay below until the society switches auto-invoicing from
 * rule lines on: until then the monthly job still bills from them.
 */
export function AutoInvoicingContent(): ReactNode {
  const canWrite = useMemo(() => canWriteFinance(currentRole()), []);
  const settings = useAutoInvoiceSettings();
  const ruleLinesOn = settings.data?.billing_auto_invoice.enabled === true;
  return (
    <>
      <AutoInvoiceForm canWrite={canWrite} />
      <RuleBook canWrite={canWrite} />
      <InterestCard />
      {ruleLinesOn && canWrite && <RunNowControl />}
      <BillingRunsPanel />
      {!ruleLinesOn && (
        <section aria-label="Billing rules in use" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Until auto-invoicing from rule lines is switched on above, the monthly job bills from these rules.
          </p>
          <BillingRulesCard />
        </section>
      )}
    </>
  );
}
