'use client';

import { type ReactNode } from 'react';
import { useToast } from '@/components/ui/toast';
import { useMoveOutSettings, useSaveMoveOutSettings } from '@/hooks/use-move-outs';
import { friendlyError } from '@/lib/api-error';

/**
 * MOVE-17 — Setup › Move Out CheckList: whether an issued NOC is also
 * e-mailed (with the PDF) to the resident leaving. Off until the community
 * admin switches it on; hidden on an API without it.
 */
export function NocEmailSwitch({ canEdit }: { canEdit: boolean }): ReactNode {
  const settings = useMoveOutSettings();
  const save = useSaveMoveOutSettings();
  const { addToast } = useToast();
  if (!settings.data) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={settings.data.noc_email}
        disabled={!canEdit || save.isPending}
        onChange={(event) =>
          save.mutate(
            { noc_email: event.target.checked },
            {
              onSuccess: (next) => addToast({ title: next.noc_email ? 'NOCs will be e-mailed' : 'NOCs will not be e-mailed', variant: 'success' }),
              onError: (error) => addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' }),
            },
          )
        }
      />
      E-mail the NOC to the resident when it is issued
    </label>
  );
}
