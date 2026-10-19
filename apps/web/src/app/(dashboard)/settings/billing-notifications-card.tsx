'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Mail, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEmailTransport } from '@/hooks/use-billing-email';
import { canChangeSettings } from './settings-access';
import { BILLING_EMAIL_EVENTS, readNotifications, type BillingNotifications } from './billing-notifications';
import { useSaveSetting } from './use-save-setting';

/**
 * Setup › Notifications (INC-S11, INC-30): which billing documents are
 * e-mailed, with the line break-up or not, and to whom. The member a
 * document is billed to always gets it. In-app and push stay always on.
 */
export function BillingNotificationsCard(): ReactNode {
  const setting = useSaveSetting('billing_notifications', 'E-mail settings');
  const transport = useEmailTransport();
  const saved = readNotifications(setting.saved);
  const savedKey = JSON.stringify(saved);
  const [form, setForm] = useState<BillingNotifications>(saved);
  useEffect(() => setForm(saved), [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const editable = canChangeSettings();

  function toggle(key: BillingNotifications['email_events'][number], on: boolean): void {
    setForm((prev) => ({
      ...prev,
      email_events: on ? [...prev.email_events, key] : prev.email_events.filter((e) => e !== key),
    }));
  }

  return (
    <Card id="billing-notifications">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Billing e-mails
        </CardTitle>
        {transport.data && !transport.data.enabled && (
          <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            E-mail sending is not configured; ticks are saved but nothing is sent.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={!editable} className="space-y-4">
          <Table aria-label="E-mail on">
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="w-24 text-center">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BILLING_EMAIL_EVENTS.map((event) => (
                <TableRow key={event.key}>
                  <TableCell>{event.label}</TableCell>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      aria-label={`E-mail on ${event.label}`}
                      checked={form.email_events.includes(event.key)}
                      onChange={(e) => toggle(event.key, e.target.checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.attach_breakup} onChange={(e) => setForm((p) => ({ ...p, attach_breakup: e.target.checked }))} />
            Attach the line break-up
          </label>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Recipients</legend>
            {([['owners_only', 'Only Owners'], ['owners_and_tenants', 'All Owners and Tenants']] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="billing-recipients" checked={form.recipients === value} onChange={() => setForm((p) => ({ ...p, recipients: value }))} />
                {label}
              </label>
            ))}
            <p className="text-xs text-muted-foreground">The member a document is billed to always receives it.</p>
          </fieldset>
        </fieldset>
        {editable ? (
          <Button type="button" onClick={() => setting.save(form)} disabled={setting.saving || JSON.stringify(form) === savedKey}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        ) : (
          <p role="note" className="text-sm text-muted-foreground">Only the society&apos;s community admin can change these.</p>
        )}
      </CardContent>
    </Card>
  );
}
