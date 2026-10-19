'use client';

import { useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useConvertToCommunity, type Ticket } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';

// POST /tickets/:id/convert-to-community admits only these.
const CONVERT_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin']);

/**
 * "Convert to Community Request" (HELP-15): offered on a Personal request
 * to the community admin; the unit stays on the request.
 */
export function ConvertToCommunityButton({ ticket }: { ticket: Pick<Ticket, 'id' | 'request_type'> }): ReactNode {
  const { addToast } = useToast();
  const convert = useConvertToCommunity();
  const allowed = useMemo(() => CONVERT_ROLES.has(currentRole() ?? ''), []);
  if (!allowed || ticket.request_type !== 'personal') return null;

  async function run(): Promise<void> {
    try {
      await convert.mutateAsync(ticket.id);
      addToast({ title: 'Converted to a Community Request', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Could not convert the request',
        description: isNotDeployed(error) ? 'Not available yet.' : friendlyError(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={convert.isPending} onClick={() => void run()}>
      Convert to Community Request
    </Button>
  );
}
