'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { useDisconnectTenant, useUpdateMemberDetail, type UpdateMemberInput } from '@/hooks/use-unit-members';
import { useRemoveMember } from '@/hooks/use-units';
import { unitPanelKeys } from '@/hooks/use-unit-panel';
import { friendlyError } from '@/lib/api-error';

type MemberChanges = Omit<UpdateMemberInput, 'unitId' | 'memberId'>;

/**
 * UNIT-17 — what the unit panel's member cards do (Edit, Make Primary
 * Contact, Move Out, Disconnect Tenant), each through today's routes, and
 * each refreshing the panel.
 */
export function usePanelActions(unitId: string) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const update = useUpdateMemberDetail();
  const remove = useRemoveMember();
  const disconnect = useDisconnectTenant();
  const refresh = () => queryClient.invalidateQueries({ queryKey: unitPanelKeys.panel(unitId) });
  const failed = (title: string) => (error: unknown) => addToast({ title, description: friendlyError(error), variant: 'destructive' });

  function saveMember(memberId: string, changes: MemberChanges, done?: () => void): void {
    if (Object.keys(changes).length === 0) {
      done?.();
      return;
    }
    update.mutate(
      { unitId, memberId, ...changes },
      {
        onSuccess: () => {
          refresh();
          addToast({ title: 'Member updated', variant: 'success' });
          done?.();
        },
        onError: failed('Failed to update member'),
      },
    );
  }

  function makePrimary(memberId: string): void {
    saveMember(memberId, { is_primary_contact: true });
  }

  function moveOut(memberId: string): void {
    remove.mutate(
      { unitId, memberId },
      {
        onSuccess: () => {
          refresh();
          addToast({ title: 'Moved out', variant: 'success' });
        },
        onError: failed('Move Out failed'),
      },
    );
  }

  function disconnectTenant(): void {
    disconnect.mutate(
      { unitId },
      {
        onSuccess: () => {
          refresh();
          addToast({ title: 'Tenant disconnected', variant: 'success' });
        },
        onError: failed('Disconnect Tenant failed'),
      },
    );
  }

  return { saveMember, makePrimary, moveOut, disconnectTenant, saving: update.isPending, refresh };
}

export type PanelActions = ReturnType<typeof usePanelActions>;
