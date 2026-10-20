'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useSaveViolationNotifications, useViolationNotifications } from '@/hooks/use-violations';
import { friendlyError } from '@/lib/api-error';

/**
 * RULE-07 — tell the unit: when a violation against a unit is approved as a
 * warning or penalty, or closed, its residents get an app notification (the
 * category and the date or invoice, never the description). Off until the
 * community admin switches it on; a click saves.
 */
export function ResidentNotifications({ canEdit }: { canEdit: boolean }): ReactNode {
  const query = useViolationNotifications();
  const save = useSaveViolationNotifications();
  const { addToast } = useToast();
  if (query.isLoading || query.error || !query.data) return null;
  const on = query.data.notify_residents;
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h3 className="text-base font-semibold">Resident notifications</h3>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={on}
            disabled={!canEdit || save.isPending}
            onChange={(event) =>
              save.mutate(
                { notify_residents: event.target.checked },
                {
                  onSuccess: (saved) => addToast({ title: saved.notify_residents ? 'Residents will be told' : 'Residents will not be told', variant: 'success' }),
                  onError: (failure) => addToast({ title: 'Could not save', description: friendlyError(failure), variant: 'destructive' }),
                },
              )
            }
          />
          <span>
            Tell the unit&apos;s residents by app notification when a violation against their unit is approved as a warning or a
            penalty, and when it is closed. The notice names the rule and the date or invoice, never the description.
          </span>
        </label>
      </CardContent>
    </Card>
  );
}
