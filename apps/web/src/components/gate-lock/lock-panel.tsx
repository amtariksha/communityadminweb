'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRequestUnlockCode, useVerifyUnlockCode } from '@/hooks/use-gate-unlock';
import type { UnlockScope } from '@/lib/gate-unlock';
import { UnlockDialog } from './unlock-dialog';

/**
 * The locked log (GATE-43, screen GATE-S4 / GATE-S8): shown when the API
 * answers 423 investigator_locked; Request Code opens "Verify it's you".
 */
export function LockPanel({ scope }: { scope: UnlockScope }): ReactNode {
  const [open, setOpen] = useState(false);
  const request = useRequestUnlockCode();
  const verify = useVerifyUnlockCode();
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="text-sm">
        The {scope === 'visitors' ? 'visitor' : 'vehicle'} log is locked. A one-time code sent to your phone opens it for 15 minutes.
      </p>
      <div className="flex gap-2">
        <Button type="button" onClick={() => setOpen(true)}>
          Request Code
        </Button>
        <Link href="/gate/investigator/access-log" className="self-center text-sm text-primary underline">
          View Logs
        </Link>
      </div>
      <UnlockDialog
        open={open}
        scope={scope}
        onClose={() => setOpen(false)}
        requestCode={(which) => request.mutateAsync(which)}
        verifyCode={(input) => verify.mutateAsync(input)}
      />
    </div>
  );
}
