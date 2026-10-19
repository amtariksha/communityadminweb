'use client';

import { useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { HelpdeskSettings, HelpdeskSettingsUpdate, NotificationAlerts } from '@/hooks';
import { ALERT_ROWS, parseCommitteeEmails } from './alert-rows';

interface NotificationAlertsFormProps {
  settings: HelpdeskSettings;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (update: HelpdeskSettingsUpdate) => Promise<void> | void;
}

export function NotificationAlertsForm({
  settings,
  canEdit,
  isSaving,
  onSave,
}: NotificationAlertsFormProps): ReactNode {
  const [alerts, setAlerts] = useState<NotificationAlerts>(settings.notification_alerts);
  const [includeContact, setIncludeContact] = useState(settings.include_contact_in_alerts);
  const [committeeText, setCommitteeText] = useState(settings.committee_emails.join('\n'));
  const [committeeError, setCommitteeError] = useState<string | null>(null);
  // Only the alerts this server knows (rows 9 and 10 came with HELP-18 / HELP-20).
  const rows = ALERT_ROWS.filter((row) => row.key in settings.notification_alerts);

  async function handleSave(): Promise<void> {
    const parsed = parseCommitteeEmails(committeeText);
    if ('error' in parsed) {
      setCommitteeError(parsed.error);
      return;
    }
    setCommitteeError(null);
    await onSave({
      notification_alerts: alerts,
      include_contact_in_alerts: includeContact,
      committee_emails: parsed.emails,
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        These switches control email only. Push notifications are always sent.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Alert</TableHead>
            <TableHead className="w-24">Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.key}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{row.label}</TableCell>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={row.label}
                  className="h-4 w-4"
                  disabled={!canEdit}
                  checked={alerts[row.key] === true}
                  onChange={(event) => setAlerts((current) => ({ ...current, [row.key]: event.target.checked }))}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          disabled={!canEdit}
          checked={includeContact}
          onChange={(event) => setIncludeContact(event.target.checked)}
        />
        Include the requester&apos;s unit and contact number in emails to owners
      </label>

      <div className="space-y-2">
        <Label htmlFor="committee-emails">Committee email list</Label>
        <Textarea
          id="committee-emails"
          rows={5}
          disabled={!canEdit}
          placeholder="One email address per line"
          value={committeeText}
          aria-invalid={committeeError ? true : undefined}
          onChange={(event) => {
            setCommitteeText(event.target.value);
            setCommitteeError(null);
          }}
        />
        {committeeError && (
          <p role="alert" className="text-xs text-destructive">
            {committeeError}
          </p>
        )}
      </div>

      {canEdit && (
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          <Save className="mr-1 h-4 w-4" /> Save Changes
        </Button>
      )}
    </div>
  );
}
