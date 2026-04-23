'use client';

import { useState, type ReactNode } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import { ExportButton } from '@/components/ui/export-button';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useApprovalRequests,
  useApprovalDetail,
  useMyPendingCount,
  useApproveRequest,
  useRejectRequest,
} from '@/hooks';
import type { ApprovalRequest } from '@/hooks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REQUEST_TYPE_LABELS: Record<string, string> = {
  tenant_onboarding: 'Tenant Onboarding',
  tenant_exit: 'Tenant Exit',
  purchase_request: 'Purchase Request',
  leave_request: 'Leave Request',
  work_order: 'Work Order',
  document: 'Document',
};

function formatRequestType(type: string): string {
  return REQUEST_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusBadgeVariant(
  status: string,
): 'warning' | 'default' | 'success' | 'destructive' | 'secondary' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'partially_approved':
      return 'default';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'destructive';
    case 'cancelled':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRequestTypeBadgeVariant(
  type: string,
): 'default' | 'secondary' | 'warning' | 'destructive' {
  switch (type) {
    case 'tenant_onboarding':
      return 'default';
    case 'tenant_exit':
      return 'warning';
    case 'purchase_request':
      return 'secondary';
    case 'leave_request':
      return 'secondary';
    case 'work_order':
      return 'warning';
    case 'document':
      return 'default';
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function StatCardSkeleton(): ReactNode {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ApprovalsContent(): ReactNode {
  const { addToast } = useToast();
  const PAGE_SIZE = 20;

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialogs
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [approveComments, setApproveComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Queries
  const approvalsQuery = useApprovalRequests({
    request_type: typeFilter || undefined,
    status: statusFilter || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });
  const pendingCountQuery = useMyPendingCount();
  const detailQuery = useApprovalDetail(selectedRequestId);

  // Mutations
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const approvals = approvalsQuery.data?.data ?? [];
  const total = approvalsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pendingCount = pendingCountQuery.data?.count ?? 0;
  const detail = detailQuery.data;

  // Derive stat counts from the loaded list (simple approach)
  const partiallyApprovedCount = approvals.filter((r) => r.status === 'partially_approved').length;
  const approvedCount = approvals.filter((r) => r.status === 'approved').length;
  const rejectedCount = approvals.filter((r) => r.status === 'rejected').length;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpenApprove(request: ApprovalRequest): void {
    setSelectedRequestId(request.id);
    setApproveComments('');
    setApproveOpen(true);
  }

  function handleOpenReject(request: ApprovalRequest): void {
    setSelectedRequestId(request.id);
    setRejectReason('');
    setRejectOpen(true);
  }

  function handleViewDetail(request: ApprovalRequest): void {
    setSelectedRequestId(request.id);
    setDetailOpen(true);
  }

  function handleApprove(): void {
    if (!selectedRequestId) return;

    approveMutation.mutate(
      { id: selectedRequestId, comments: approveComments.trim() || undefined },
      {
        onSuccess() {
          addToast({ title: 'Request approved successfully', variant: 'success' });
          setApproveOpen(false);
          setSelectedRequestId('');
          setApproveComments('');
        },
        onError(error) {
          addToast({
            title: 'Failed to approve request',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleReject(): void {
    if (!selectedRequestId || !rejectReason.trim()) {
      addToast({ title: 'Reason is required', variant: 'destructive' });
      return;
    }

    rejectMutation.mutate(
      { id: selectedRequestId, reason: rejectReason.trim() },
      {
        onSuccess() {
          addToast({ title: 'Request rejected', variant: 'success' });
          setRejectOpen(false);
          setSelectedRequestId('');
          setRejectReason('');
        },
        onError(error) {
          addToast({
            title: 'Failed to reject request',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleClearFilters(): void {
    setTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Approvals' }]}
        title="Approvals"
        description="Review and approve pending requests"
        actions={
          <ExportButton
            data={approvals as unknown as Record<string, unknown>[]}
            filename={`approvals-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'request_type', label: 'Type' },
              { key: 'title', label: 'Title' },
              { key: 'requester_name', label: 'Requester' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Created' },
            ]}
          />
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pendingCountQuery.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">Awaiting your action</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Partially Approved</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{partiallyApprovedCount}</div>
                <p className="text-xs text-muted-foreground">Multi-level in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvedCount}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rejectedCount}</div>
                <p className="text-xs text-muted-foreground">Declined</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="approval-type">Type</Label>
              <Select
                id="approval-type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All</option>
                <option value="tenant_onboarding">Tenant Onboarding</option>
                <option value="tenant_exit">Tenant Exit</option>
                <option value="purchase_request">Purchase Request</option>
                <option value="leave_request">Leave Request</option>
                <option value="work_order">Work Order</option>
                <option value="document">Document</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-status">Status</Label>
              <Select
                id="approval-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="partially_approved">Partially Approved</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approvals table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Requests</CardTitle>
            <p className="text-sm text-muted-foreground">{total} total</p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request Type</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvalsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : approvals.length > 0 ? (
                approvals.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Badge variant={getRequestTypeBadgeVariant(request.request_type)}>
                        {formatRequestType(request.request_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {request.entity_summary ?? '-'}
                    </TableCell>
                    <TableCell>
                      {request.requester_name ?? request.requested_by ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {request.approval_level}/{request.max_levels}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {formatStatus(request.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewDetail(request)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {request.status === 'pending' || request.status === 'partially_approved' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              onClick={() => handleOpenApprove(request)}
                              title="Approve"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleOpenReject(request)}
                              title="Reject"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No approval requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Confirm approval for this request. You may add optional comments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approve-comments">Comments (optional)</Label>
              <Textarea
                id="approve-comments"
                placeholder="Add any comments..."
                rows={3}
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={approveMutation.isPending}
              onClick={handleApprove}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Reason for rejection..."
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              onClick={handleReject}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) { setSelectedRequestId(''); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approval Request Details</DialogTitle>
            <DialogDescription>
              {detail?.request.entity_summary ?? 'Loading...'}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-4 py-4">
              {/* Request info */}
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Type</span>
                <span>
                  <Badge variant={getRequestTypeBadgeVariant(detail.request.request_type)}>
                    {formatRequestType(detail.request.request_type)}
                  </Badge>
                </span>

                <span className="text-muted-foreground">Status</span>
                <span>
                  <Badge variant={getStatusBadgeVariant(detail.request.status)}>
                    {formatStatus(detail.request.status)}
                  </Badge>
                </span>

                <span className="text-muted-foreground">Requested By</span>
                <span>{detail.request.requester_name ?? detail.request.requested_by ?? '-'}</span>

                {detail.request.requester_phone && (
                  <>
                    <span className="text-muted-foreground">Phone</span>
                    <span>{detail.request.requester_phone}</span>
                  </>
                )}

                <span className="text-muted-foreground">Approval Level</span>
                <span>{detail.request.approval_level} of {detail.request.max_levels}</span>

                <span className="text-muted-foreground">Requested At</span>
                <span>{formatDate(detail.request.requested_at)}</span>

                {detail.request.completed_at && (
                  <>
                    <span className="text-muted-foreground">Completed At</span>
                    <span>{formatDate(detail.request.completed_at)}</span>
                  </>
                )}

                {detail.request.entity_summary && (
                  <>
                    <span className="text-muted-foreground">Summary</span>
                    <span>{detail.request.entity_summary}</span>
                  </>
                )}
              </div>

              <Separator />

              {/* Approval steps timeline */}
              <div>
                <h4 className="mb-3 text-sm font-semibold">Approval Steps</h4>
                <div className="space-y-3">
                  {detail.steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-3 rounded-md border p-3"
                    >
                      <div className="mt-0.5">
                        {step.decision === 'approved' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : step.decision === 'rejected' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Level {step.level} &mdash; {step.approver_type}
                            {step.approver_role ? ` (${step.approver_role})` : ''}
                          </p>
                          <Badge variant={getStatusBadgeVariant(step.decision)}>
                            {formatStatus(step.decision)}
                          </Badge>
                        </div>
                        {step.decided_by_name && (
                          <p className="text-xs text-muted-foreground">
                            By: {step.decided_by_name}
                          </p>
                        )}
                        {step.decided_at && (
                          <p className="text-xs text-muted-foreground">
                            {formatDate(step.decided_at)}
                          </p>
                        )}
                        {step.comments && (
                          <p className="text-sm text-muted-foreground italic">
                            &ldquo;{step.comments}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {detail.steps.length === 0 && (
                    <p className="text-sm text-muted-foreground">No approval steps recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Actions in detail */}
              {(detail.request.status === 'pending' || detail.request.status === 'partially_approved') && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setDetailOpen(false);
                        handleOpenApprove(detail.request);
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDetailOpen(false);
                        handleOpenReject(detail.request);
                      }}
                    >
                      <Ban className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
