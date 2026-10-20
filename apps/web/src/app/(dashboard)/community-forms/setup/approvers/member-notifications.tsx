'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useFormNotifications, useSaveFormNotifications } from '@/hooks/use-community-forms';
import { friendlyError } from '@/lib/api-error';

/**
 * FORM-04 / FORM-05 — tell members: a published form reaches its audience
 * ("New form: …"), a decided response its respondent. Off until the
 * community admin ticks it; a click saves.
 */
export function MemberNotifications({ canEdit }: { canEdit: boolean }): ReactNode {
  const query = useFormNotifications();
  const save = useSaveFormNotifications();
  const { addToast } = useToast();
  if (query.isLoading || query.error || !query.data) return null;
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h3 className="text-base font-semibold">Member notifications</h3>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={query.data.notify_residents}
            disabled={!canEdit || save.isPending}
            onChange={(event) =>
              save.mutate(
                { notify_residents: event.target.checked },
                {
                  onSuccess: (saved) => addToast({ title: saved.notify_residents ? 'Members will be told' : 'Members will not be told', variant: 'success' }),
                  onError: (failure) => addToast({ title: 'Could not save', description: friendlyError(failure), variant: 'destructive' }),
                },
              )
            }
          />
          <span>
            Tell members by app notification when a form for them is published, and tell a member when their response is
            approved or not approved.
          </span>
        </label>
      </CardContent>
    </Card>
  );
}
