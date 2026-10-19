'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BellRing, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { getCurrentTenant, getUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  daysToSlots,
  normalizeReminderDays,
  ordinalDay,
  readDuesReminders,
  sameReminders,
  type DuesReminders,
} from './dues-reminders';

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

// Matches PATCH /tenants/:id/settings, which allows only these.
function canChangeSettings(): boolean {
  const user = getUser();
  if (user?.isSuperAdmin) return true;
  const tenantId = getCurrentTenant();
  return user?.societies.find((s) => s.id === tenantId)?.role === 'community_admin';
}

function savedMessage(reminders: DuesReminders): string {
  if (!reminders.enabled) return 'Automatic reminders are off.';
  return `Reminders go out at 09:00 IST on the ${reminders.days.map(ordinalDay).join(', ')} of each month.`;
}

/**
 * Settings › Automatic dues reminders (INC-02). On each chosen day the API's
 * reminder job e-mails every unit with an invoice past its due date.
 */
export function DuesRemindersCard(): ReactNode {
  const { addToast } = useToast();
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  const updateSettings = useTenantSettings();
  const saved = readDuesReminders(tenantQuery.data?.settings_json?.billing_reminders);
  const savedKey = `${saved.enabled}|${saved.days.join(',')}`;

  const [enabled, setEnabled] = useState(saved.enabled);
  const [slots, setSlots] = useState<number[]>(() => daysToSlots(saved.days));

  useEffect(() => {
    setEnabled(saved.enabled);
    setSlots(daysToSlots(saved.days));
    // savedKey captures every field of `saved`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  if (!tenantId || !canChangeSettings()) return null;

  const draft: DuesReminders = { enabled, days: normalizeReminderDays(slots) };
  const needsDay = draft.enabled && draft.days.length === 0;
  const canSave = !sameReminders(draft, saved) && !needsDay && !updateSettings.isPending;

  function setSlot(index: number, day: number): void {
    setSlots((prev) => prev.map((value, i) => (i === index ? day : value)));
  }

  function save(): void {
    updateSettings.mutate(
      // Keep the reminder text saved on Setup › Defaulters (INC-30): the
      // settings save replaces the whole key.
      {
        tenant_id: tenantId,
        settings: { billing_reminders: { ...draft, template: tenantQuery.data?.settings_json?.billing_reminders?.template } },
      },
      {
        onSuccess: (tenant) => {
          // A server without this setting drops the key and still answers 200.
          if (!sameReminders(readDuesReminders(tenant?.settings_json?.billing_reminders), draft)) {
            addToast({
              title: 'Reminders not saved',
              description: 'The server does not support this setting yet.',
              variant: 'destructive',
            });
            return;
          }
          addToast({
            title: 'Dues reminders saved',
            description: savedMessage(draft),
            variant: 'success',
          });
        },
        onError: (error) => {
          addToast({
            title: 'Could not save reminders',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          Automatic dues reminders
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          On each chosen day, every unit with an invoice past its due date gets an e-mail listing
          its dues, plus an in-app notification.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-3">
          <div>
            <p id="dues-reminders-label" className="text-sm font-medium">
              Send reminders automatically
            </p>
            <p className="text-xs text-muted-foreground">Off by default. Runs at 09:00 IST.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-labelledby="dues-reminders-label"
            onClick={() => setEnabled((value) => !value)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              enabled ? 'bg-primary' : 'bg-input',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 rounded-full bg-background shadow transition-transform',
                enabled ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {slots.map((day, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`dues-reminder-day-${index}`}>Reminder day {index + 1}</Label>
                <Select
                  id={`dues-reminder-day-${index}`}
                  value={String(day)}
                  onChange={(e) => setSlot(index, Number(e.target.value))}
                >
                  <option value="0">Off</option>
                  {DAY_OPTIONS.map((option) => (
                    <option key={option} value={String(option)}>
                      {ordinalDay(option)}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            29th–31st run on the last day of shorter months.
          </p>
          {needsDay && (
            <p className="text-xs text-destructive">
              Pick at least one day, or switch reminders off.
            </p>
          )}
        </div>

        <Button onClick={save} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {updateSettings.isPending ? 'Saving…' : 'Save reminders'}
        </Button>
      </CardContent>
    </Card>
  );
}
