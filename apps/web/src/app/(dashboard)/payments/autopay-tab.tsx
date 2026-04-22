'use client';

import { useState, type ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pause, Play, Ban } from 'lucide-react';
import {
  useAutopaySubscriptions,
  usePauseSubscription,
  useResumeSubscription,
  useCancelAutopaySubscription,
} from '@/hooks';
import type { AutopaySubscription } from '@/hooks';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/utils';

function statusVariant(
  status: string,
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'cancelled':
    case 'expired':
      return 'destructive';
    case 'created':
    case 'pending':
    default:
      return 'secondary';
  }
}

/**
 * Batch 10 — Autopay Mandates tab.
 *
 * Surfaces Razorpay-subscription-backed autopay mandates so community
 * admins can see who's auto-paying, pause a subscription during a
 * dispute, or cancel one on request. Creation happens in the resident
 * Flutter app (UPI mandate authorization); admin-web is observe + act.
 */
export function AutopayTab(): ReactNode {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const subsQuery = useAutopaySubscriptions({
    status: statusFilter || undefined,
  });
  const pause = usePauseSubscription();
  const resume = useResumeSubscription();
  const cancel = useCancelAutopaySubscription();

  const subscriptions = subsQuery.data?.data ?? [];

  function unitLabel(sub: AutopaySubscription): string {
    return sub.unit_number ?? sub.unit_id;
  }

  function handlePause(sub: AutopaySubscription): void {
    if (!window.confirm(`Pause autopay for unit ${unitLabel(sub)}?`)) return;
    pause.mutate(sub.id, {
      onSuccess() {
        addToast({ title: 'Autopay paused', variant: 'success' });
      },
      onError(err) {
        addToast({
          title: 'Pause failed',
          description: (err as Error).message,
          variant: 'destructive',
        });
      },
    });
  }

  function handleResume(sub: AutopaySubscription): void {
    resume.mutate(sub.id, {
      onSuccess() {
        addToast({ title: 'Autopay resumed', variant: 'success' });
      },
      onError(err) {
        addToast({
          title: 'Resume failed',
          description: (err as Error).message,
          variant: 'destructive',
        });
      },
    });
  }

  function handleCancel(sub: AutopaySubscription): void {
    const reason = window.prompt(
      `Cancel autopay mandate for unit ${unitLabel(sub)}?\n\n` +
        'Irreversible. The resident will need to re-authorize a fresh mandate in the Flutter app.\n\n' +
        'Enter a reason (optional):',
      '',
    );
    if (reason === null) return; // user clicked Cancel
    cancel.mutate(
      { id: sub.id, reason: reason || undefined },
      {
        onSuccess() {
          addToast({ title: 'Autopay cancelled', variant: 'success' });
        },
        onError(err) {
          addToast({
            title: 'Cancel failed',
            description: (err as Error).message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Autopay Mandates</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                UPI auto-debit mandates authorized by residents. Created
                from the Flutter resident app; admins can observe and
                pause / resume / cancel here.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>UPI VPA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : subsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-destructive">
                    Failed to load mandates —{' '}
                    {(subsQuery.error as Error)?.message ?? 'unknown error'}.{' '}
                    <Button
                      size="sm"
                      variant="link"
                      className="px-1 text-destructive underline"
                      onClick={() => subsQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : subscriptions.length > 0 ? (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.unit_number ?? '—'}
                    </TableCell>
                    <TableCell>{sub.member_name ?? '—'}</TableCell>
                    <TableCell>
                      {sub.plan_amount != null
                        ? formatCurrency(sub.plan_amount)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.rule_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(sub.status)}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {sub.upi_vpa ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(sub.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {sub.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Pause"
                            onClick={() => handlePause(sub)}
                            disabled={pause.isPending}
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {sub.status === 'paused' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Resume"
                            onClick={() => handleResume(sub)}
                            disabled={resume.isPending}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {(sub.status === 'active' || sub.status === 'paused') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            title="Cancel mandate"
                            onClick={() => handleCancel(sub)}
                            disabled={cancel.isPending}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No autopay mandates yet. Residents authorize mandates
                    from the Flutter app; once they do, subscriptions
                    appear here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
