'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import {
  useVehicles,
  useApproveVehicle,
  useRejectVehicle,
  type Vehicle,
} from '@/hooks';

// FeatPlan #OW-3 — vehicle approval queue.
//
// Lists every `gas_recharge`-style pending vehicle for the current
// tenant — rows where `approval_status='pending'` and
// `is_active=false`. Backend (parking.controller.ts:191) accepts
// `?approval_status=pending` to bypass the legacy is_active=true
// filter. Approve/reject endpoints (line 234, 249) are gated to
// community_admin / committee_member / super_admin server-side; a
// non-allowlisted role gets 403 — surfaced via the standard
// friendlyError toast on the action.
//
// One-page UI, no pagination — pending queues are small in
// practice (≪ 100). If they grow beyond that, add page=/limit=
// query params (already accepted by the backend).

export default function VehicleApprovalsContent(): ReactNode {
  const { addToast } = useToast();
  const vehiclesQuery = useVehicles({ approval_status: 'pending' });
  const approveMutation = useApproveVehicle();
  const rejectMutation = useRejectVehicle();

  // Reject dialog state — captures the audit-trail reason before
  // hitting PATCH /vehicles/:id/reject. Approve has no dialog
  // (one-click action).
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Vehicle | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pending = vehiclesQuery.data ?? [];
  const isLoading = vehiclesQuery.isLoading;

  function openReject(vehicle: Vehicle): void {
    setRejectTarget(vehicle);
    setRejectReason('');
    setRejectOpen(true);
  }

  function handleApprove(vehicle: Vehicle): void {
    approveMutation.mutate(vehicle.id, {
      onSuccess() {
        addToast({
          title: 'Vehicle approved',
          description: `${vehicle.registration_number} is now active for ${
            vehicle.member_name ?? 'this resident'
          }.`,
          variant: 'success',
        });
      },
      onError(err) {
        addToast({
          title: 'Failed to approve vehicle',
          description: friendlyError(err),
          variant: 'destructive',
        });
      },
    });
  }

  function handleReject(): void {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      addToast({
        title: 'Reason required',
        description:
          'A short reason is logged with the rejection so the resident sees why.',
        variant: 'destructive',
      });
      return;
    }
    rejectMutation.mutate(
      { id: rejectTarget.id, reason: rejectReason.trim() },
      {
        onSuccess() {
          setRejectOpen(false);
          addToast({
            title: 'Vehicle rejected',
            description: `${rejectTarget.registration_number} marked as rejected.`,
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to reject vehicle',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Approvals', href: '/approvals' },
          { label: 'Vehicles' },
        ]}
        title="Vehicle Approvals"
        description="Review and approve resident-registered vehicles waiting to enter the property."
      />

      <Link
        href="/approvals"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all approvals
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Pending vehicles
              {pending.length > 0 && (
                <Badge variant="warning">{pending.length}</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              <ShieldCheck className="mr-1 inline h-3 w-3" />
              Community-admin / committee-member only
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
              No pending vehicles. Every registered vehicle has been
              reviewed.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">
                      {v.registration_number}
                    </TableCell>
                    <TableCell className="capitalize">
                      {v.vehicle_type}
                    </TableCell>
                    <TableCell>{v.member_name ?? '—'}</TableCell>
                    <TableCell>{v.unit_number ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[v.make, v.model, v.color].filter(Boolean).join(' ') ||
                        '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(v.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(v)}
                          disabled={
                            approveMutation.isPending ||
                            rejectMutation.isPending
                          }
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => openReject(v)}
                          disabled={
                            approveMutation.isPending ||
                            rejectMutation.isPending
                          }
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject dialog — backend (parking.controller.ts:249) requires
          a reason; pinned to vehicles.metadata.rejection_reason for
          the audit trail. */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject vehicle</DialogTitle>
            <DialogDescription>
              The reason is shown to the resident on their parking
              screen and logged for audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {rejectTarget && (
              <p className="text-sm text-muted-foreground">
                <span className="font-mono">
                  {rejectTarget.registration_number}
                </span>{' '}
                — {rejectTarget.member_name ?? 'unknown resident'}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                rows={3}
                placeholder="e.g. Vehicle type not allowed in this society."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
