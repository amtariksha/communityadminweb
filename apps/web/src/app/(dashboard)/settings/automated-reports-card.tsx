'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Mail, Play, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import {
  useTenant,
  useTenantSettings,
} from '@/hooks';
import { getCurrentTenant } from '@/lib/auth';

type ReportKey =
  | 'trial_balance'
  | 'income_expenditure'
  | 'defaulters'
  | 'collection_summary';

const REPORT_LABELS: Record<ReportKey, string> = {
  trial_balance: 'Trial Balance',
  income_expenditure: 'Income & Expenditure',
  defaulters: 'Defaulters list',
  collection_summary: 'Collection summary',
};

const ALL_REPORTS: ReportKey[] = [
  'trial_balance',
  'income_expenditure',
  'defaulters',
  'collection_summary',
];

/**
 * Settings → Automated reports.
 *
 * Surfaces the `tenants.settings_json.scheduled_reports` config:
 * - master on/off toggle
 * - which reports to include (defaults: all four)
 * - optional explicit recipient emails (empty = auto-resolve from
 *   committee_member + community_admin user emails)
 * - day-of-month + time-of-day (defaults 1st, 09:00 IST)
 *
 * Includes a "Send now" button that calls POST /scheduled-reports/
 * trigger-now so the community admin can dry-run the digest without
 * waiting for the 1st.
 */
export function AutomatedReportsCard(): ReactNode {
  const tenantId = getCurrentTenant();
  const { data: tenant } = useTenant(tenantId ?? '');
  const updateSettings = useTenantSettings();
  const { addToast } = useToast();

  const current = tenant?.settings_json?.scheduled_reports ?? {};

  const [enabled, setEnabled] = useState<boolean>(false);
  const [selected, setSelected] = useState<Set<ReportKey>>(
    new Set(ALL_REPORTS),
  );
  const [recipients, setRecipients] = useState<string>('');
  const [dayOfMonth, setDayOfMonth] = useState<string>('1');
  const [timeOfDay, setTimeOfDay] = useState<string>('09:00');
  const [triggering, setTriggering] = useState(false);

  // Hydrate from the server payload once it loads.
  useEffect(() => {
    if (!tenant) return;
    const c = tenant.settings_json?.scheduled_reports ?? {};
    setEnabled(c.enabled === true);
    setSelected(
      new Set<ReportKey>(
        (c.reports && c.reports.length > 0
          ? c.reports
          : ALL_REPORTS) as ReportKey[],
      ),
    );
    setRecipients(Array.isArray(c.recipients) ? c.recipients.join(', ') : '');
    setDayOfMonth(String(c.day_of_month ?? 1));
    setTimeOfDay(typeof c.time_of_day === 'string' ? c.time_of_day : '09:00');
  }, [tenant]);

  if (!tenantId) return null;

  function toggleReport(key: ReportKey): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function parsedRecipients(): string[] {
    return recipients
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  function recipientsAreValid(): boolean {
    return parsedRecipients().every((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
  }

  async function handleSave(): Promise<void> {
    if (!tenantId || !tenant) return;
    if (!recipientsAreValid()) {
      addToast({
        title: 'Invalid email in recipients',
        description: 'Use comma- or newline-separated addresses.',
        variant: 'destructive',
      });
      return;
    }
    const day = parseInt(dayOfMonth, 10);
    if (!Number.isFinite(day) || day < 1 || day > 28) {
      addToast({
        title: 'Day of month must be between 1 and 28',
        description:
          '28 is the max to guarantee the day exists in every calendar month.',
        variant: 'destructive',
      });
      return;
    }

    updateSettings.mutate(
      {
        tenant_id: tenantId,
        settings: {
          scheduled_reports: {
            enabled,
            reports: ALL_REPORTS.filter((r) => selected.has(r)),
            recipients: parsedRecipients(),
            day_of_month: day,
            time_of_day: timeOfDay,
          },
        },
        expected_row_version: tenant.row_version,
      },
      {
        onSuccess() {
          addToast({ title: 'Automated reports updated', variant: 'success' });
        },
        onError(err) {
          addToast({
            title: 'Failed to update',
            description: (err as Error).message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  async function handleTriggerNow(): Promise<void> {
    const selectedReports = ALL_REPORTS.filter((r) => selected.has(r));
    if (selectedReports.length === 0) {
      addToast({
        title: 'Pick at least one report to send',
        variant: 'destructive',
      });
      return;
    }
    setTriggering(true);
    try {
      const res = await api.post<{
        data: {
          tenant_name: string;
          sent: boolean;
          reports: string[];
          reason?: string;
        };
      }>('/scheduled-reports/trigger-now', { reports: selectedReports });
      const r = res.data;
      if (r.sent) {
        addToast({
          title: `Sent ${r.reports.length} report${r.reports.length === 1 ? '' : 's'}`,
          description:
            'Check the configured recipients\' inboxes. If the email service is disabled on this environment, the send was a no-op — see pm2 logs.',
          variant: 'success',
        });
      } else {
        addToast({
          title: 'Send skipped',
          description: `Reason: ${r.reason ?? 'unknown'}. If no recipients resolve, add explicit emails in the Recipients field.`,
          variant: 'destructive',
        });
      }
    } catch (err) {
      addToast({
        title: 'Trigger failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setTriggering(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Automated Reports</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerNow}
              disabled={triggering}
              title="Send a test digest right now using current settings"
            >
              <Play className="mr-2 h-4 w-4" />
              {triggering ? 'Sending…' : 'Send now'}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Monthly email digest — the selected reports are generated on the
          chosen day and emailed to the recipients below. Runs automatically
          at the start of each month.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Enable monthly digest</p>
            <p className="text-xs text-muted-foreground">
              When off, the scheduler skips this tenant. &apos;Send now&apos;
              still works for testing.
            </p>
          </div>
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">Reports to include</p>
          <div className="grid gap-2 md:grid-cols-2">
            {ALL_REPORTS.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-md border p-2"
              >
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggleReport(key)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{REPORT_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sr-recipients">
            Recipients{' '}
            <span className="text-muted-foreground">
              (comma- or newline-separated; leave blank to auto-resolve from
              committee + community-admin emails)
            </span>
          </Label>
          <Input
            id="sr-recipients"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="secretary@society.com, treasurer@society.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sr-day">Day of month</Label>
            <Input
              id="sr-day"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">1–28. Defaults to 1st.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-time">Time of day (IST)</Label>
            <Input
              id="sr-time"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The monthly cron fires at 09:00 IST centrally; per-tenant time
              is informational for now.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
