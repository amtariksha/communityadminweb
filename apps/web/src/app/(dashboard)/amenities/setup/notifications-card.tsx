'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { AmenityNotificationKey, AmenityNotifications } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAmenitySettings, useSaveAmenitySettings } from '@/hooks/use-amenity-setup';
import { ApiError, friendlyError } from '@/lib/api-error';

/**
 * Amenity & Event › Setup › Setup Notifications (AMEN-45): one switch per
 * booking notice we send, and whether the switched-on notices also go by
 * e-mail. Everything new is off until switched on here; Booking confirmed
 * (sent as before) stays on.
 */
export const NOTIFICATION_SWITCHES: ReadonlyArray<{ key: AmenityNotificationKey; label: string }> = [
  { key: 'booking_confirmed', label: 'Booking confirmed — to the flat when a booking is confirmed' },
  { key: 'awaiting_payment', label: 'Awaiting payment — what to pay, and by when, for a booking with a charge' },
  { key: 'payment_reminder', label: 'Payment reminder — a day before an unpaid booking is cancelled' },
  { key: 'auto_cancelled', label: 'Cancelled for non-payment — when an unpaid booking is cancelled automatically' },
  { key: 'cancelled_by_society', label: 'Cancelled by the society — when the committee cancels a booking' },
  { key: 'email', label: 'Also send these by e-mail to the resident' },
];

export function NotificationsCard(): ReactNode {
  const { addToast } = useToast();
  const settings = useAmenitySettings();
  const save = useSaveAmenitySettings();
  const [switches, setSwitches] = useState<AmenityNotifications | null>(null);

  useEffect(() => {
    if (settings.data) setSwitches(settings.data.notifications);
  }, [settings.data]);

  if (settings.isLoading) return null;
  if (settings.error || !switches) {
    const notYet = settings.error instanceof ApiError && settings.error.status === 404;
    return <p className="text-sm text-muted-foreground">{notYet ? 'Setup Notifications are not available yet on this server.' : 'The notification settings could not be loaded.'}</p>;
  }

  async function onSave(): Promise<void> {
    if (!switches) return;
    try {
      await save.mutateAsync({ notifications: switches });
      addToast({ title: 'Notification settings saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the notification settings', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-3">
      {NOTIFICATION_SWITCHES.map((item) => (
        <label key={item.key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={switches[item.key]}
            onChange={(e) => setSwitches({ ...switches, [item.key]: e.target.checked })}
          />
          {item.label}
        </label>
      ))}
      <p className="text-xs text-muted-foreground">There is no SMS for these notices yet.</p>
      <Button onClick={() => void onSave()} disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  );
}
