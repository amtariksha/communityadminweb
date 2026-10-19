'use client';

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
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
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { NewSubletDialog } from './new-sublet-dialog';
import {
  useCancelSublet,
  useSublets,
} from '@/hooks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function subletStatusVariant(
  status: string,
): 'warning' | 'success' | 'secondary' | 'destructive' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'active':
      return 'success';
    case 'expired':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// Sublets Tab
// ---------------------------------------------------------------------------

/** Parking › Sublets: our slot sublets (both layouts; a Slots sub-tab in classic, PARK-D5). */
export function SubletsTab(): ReactNode {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');

  const subletsQuery = useSublets({
    status: statusFilter || undefined,
  });
  const cancelSublet = useCancelSublet();

  const sublets = subletsQuery.data ?? [];

  // QA #357-admin — New Sublet dialog state. Mounted at the tab
  // level so the dialog form re-mounts (and resets) every time
  // the admin opens it.
  const [createOpen, setCreateOpen] = useState(false);

  function handleCancel(id: string): void {
    if (
      !window.confirm(
        'Cancel this sublet? The slot returns to the original owner.',
      )
    ) {
      return;
    }
    cancelSublet.mutate(id, {
      onSuccess() {
        addToast({ title: 'Sublet cancelled', variant: 'success' });
      },
      onError(err) {
        addToast({
          title: 'Failed to cancel sublet',
          description: friendlyError(err),
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sublets</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Sublet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Sublettee</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Monthly Charge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subletsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sublets.length > 0 ? (
                sublets.map((sublet) => (
                  <TableRow key={sublet.id}>
                    <TableCell className="font-mono text-xs">{sublet.slot_number ?? '-'}</TableCell>
                    <TableCell>{sublet.owner_name ?? '-'}</TableCell>
                    <TableCell>{sublet.sublettee_name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(sublet.start_date)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sublet.end_date ? formatDate(sublet.end_date) : 'Ongoing'}
                    </TableCell>
                    <TableCell>{formatCurrency(sublet.monthly_charge)}</TableCell>
                    <TableCell>
                      <Badge variant={subletStatusVariant(sublet.status)}>
                        {sublet.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Cancel only meaningful for active rows;
                          backend rejects pending / cancelled / expired
                          attempts anyway. Hide the button to make the
                          UI honest. */}
                      {(sublet.status === 'active' || sublet.status === 'pending') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(sublet.id)}
                          disabled={
                            cancelSublet.isPending && cancelSublet.variables === sublet.id
                          }
                        >
                          {cancelSublet.isPending && cancelSublet.variables === sublet.id
                            ? 'Cancelling…'
                            : 'Cancel'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No sublets found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Sublet dialog — extracted so the form state stays
          local and resets whenever the admin re-opens it. */}
      <NewSubletDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
