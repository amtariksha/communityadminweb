'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGuardRoster } from '@/hooks/use-gate-desk';
import { indiaDateTime } from '@/lib/india-time';
import { NotAvailableYet, SetupBlock } from './setup-block';

const ROLE_LABELS: Readonly<Record<string, string>> = {
  security_guard: 'Security Guard',
  security_supervisor: 'Security Supervisor',
};

/**
 * Block 9 — Guard Roster (GATE-47, Part 7 D3): who signs in to the guard app.
 * We keep our own sign-in; guards are added or retired in Staff Manager.
 */
export function GuardRosterBlock(): ReactNode {
  const roster = useGuardRoster();
  return (
    <SetupBlock
      title="Guard Roster"
      description={
        <>
          Everyone who can sign in to the guard app. Add or retire a guard in{' '}
          <Link href="/staff/active" className="text-primary underline">
            Staff Manager
          </Link>
          .
        </>
      }
    >
      {roster.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : roster.isError ? (
        <p role="alert" className="text-sm text-destructive">The roster could not be loaded. Reload the page to try again.</p>
      ) : !roster.data ? (
        <NotAvailableYet what="The guard roster and its details" />
      ) : roster.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one holds a guard role yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Phone (last 4)</th>
              <th className="p-2">Role</th>
              <th className="p-2">Last Sign-in</th>
              <th className="p-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {roster.data.map((row) => (
              <tr key={row.user_id} className="border-t">
                <td className="p-2">{row.name ?? '—'}</td>
                <td className="p-2 tabular-nums">{row.phone_last4 ? `••${row.phone_last4}` : '—'}</td>
                <td className="p-2">{row.roles.map((role) => ROLE_LABELS[role] ?? role).join(', ')}</td>
                <td className="p-2 whitespace-nowrap">{row.last_sign_in_at ? indiaDateTime(row.last_sign_in_at) : 'Never'}</td>
                <td className="p-2">{row.is_active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SetupBlock>
  );
}
