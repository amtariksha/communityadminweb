'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FormFrame } from '@/components/form-page';
import { ShowLogsButton } from '@/components/show-logs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useSaveUtilityInterest, useUtilitySettings } from '@/hooks/use-utility-settings';
import { friendlyError } from '@/lib/api-error';
import { useAdminLayout } from '@/lib/layout-context';
import { isNotDeployed } from '@/lib/not-deployed';
import {
  interestErrors,
  readInterestSettings,
  type InterestForm,
} from '@/app/(dashboard)/settings/interest-settings';
import { UtilityInterestFields } from './interest-form';

/** Where Close goes: Utility Tracker › Setup in classic, the utilities page in standard. */
const closeHref = (classic: boolean): string => (classic ? '/utilities/setup' : '/utilities');

/**
 * Utility Tracker › Setup › Edit (Simple Interest), UTIL-S3 / UTIL-06: the
 * rate, due days, start date and basis of utility invoices, apart from
 * maintenance. Finance writers save; readers see the values.
 */
export default function UtilityInterestPage(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const router = useRouter();
  const access = useFinanceAccess();
  const { addToast } = useToast();
  const query = useUtilitySettings();
  const save = useSaveUtilityInterest();
  const savedKey = JSON.stringify(query.data?.utility_interest ?? null);
  const [form, setForm] = useState<InterestForm>(readInterestSettings(query.data?.utility_interest));

  useEffect(() => {
    setForm(readInterestSettings(query.data?.utility_interest));
    // savedKey captures every saved field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  if (isNotDeployed(query.error)) {
    return <p className="text-sm text-muted-foreground">Utility interest settings are not available yet on this server.</p>;
  }
  if (query.isLoading || !query.data) return <Skeleton className="h-64 w-full" />;

  const errors = interestErrors(form);
  const close = (): void => router.push(closeHref(classic));

  function submit(): void {
    if (!access.canWrite || Object.keys(errors).length > 0) return;
    save.mutate(
      {
        rate_pa: Number(form.rate_pa),
        due_days: Number(form.due_days),
        basis: form.basis,
        start_date: form.start_date === '' ? null : form.start_date,
      },
      {
        onSuccess: (saved) =>
          addToast({
            title: 'Utility interest saved',
            description: `${saved.utility_interest.rate_pa}% a year; utility invoices fall due ${saved.utility_interest.due_days} days after the invoice date.`,
            variant: 'success',
          }),
        onError: (error) => addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  const maintenance = query.data.maintenance_interest;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ShowLogsButton recordTypes={['tenant_settings']} />
      </div>
      <FormFrame
        mode="page"
        title="Late payment interest — utilities"
        description={
          query.data.utility_interest_inherited
            ? `Not set for utilities yet: utility invoices follow maintenance (${maintenance.rate_pa}% a year, due in ${maintenance.due_days} days).`
            : `Maintenance invoices keep their own rule (${maintenance.rate_pa}% a year, due in ${maintenance.due_days} days).`
        }
        onClose={close}
        onSave={submit}
        saving={save.isPending}
      >
        {!access.canWrite && (
          <p role="note" className="text-sm text-muted-foreground">
            Only the community admin or the accountant can change these settings.
          </p>
        )}
        <UtilityInterestFields
          form={form}
          errors={errors}
          disabled={!access.canWrite}
          onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
        />
      </FormFrame>
    </div>
  );
}
