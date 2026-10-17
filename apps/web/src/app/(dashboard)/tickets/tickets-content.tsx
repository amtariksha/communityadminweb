'use client';

import { useState, useEffect, type ReactNode } from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  UserCheck,
  Timer,
  SlidersHorizontal,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useTickets,
  useTicketStats,
  useHelpdeskCategories,
  useHelpdeskAssignees,
  useTicketCategories,
  useCreateTicket,
  useBulkCloseTickets,
  useBulkReassignTickets,
  useUploadFileToS3,
  useHelpdeskKpi,
} from '@/hooks';
import type { Ticket } from '@/hooks';
import { useListUrlState } from '@/hooks/use-list-url-state';
import { useOpenOnNewParam } from '@/hooks/use-open-on-new-param';
import { UploadProgress } from '@/components/ui/upload-progress';
import { useAdminLayout } from '@/lib/layout-context';
import { ticketStatusLabel } from '@/lib/ticket-status';
import { CannedTemplatesDialog } from './canned-templates-dialog';
import { priorityTone, requestAgeDays, statusTone } from './ticket-badges';
import { TicketDetailDialog } from './ticket-detail-dialog';
import { useTicketStatusUpdate } from './use-ticket-status-update';
import { categoryChoices } from './category-choices';
import { BulkReassignDialog } from './bulk-reassign-dialog';
import { QueueTabs, type QueueTab } from './queue-tabs';

const TICKET_SORTS = [
  'created_at',
  'updated_at',
  'priority',
  'status',
  'sla_due_at',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export default function TicketsContent(): ReactNode {
  const { addToast } = useToast();
  const layout = useAdminLayout();
  const PAGE_SIZE = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  // QA #46 — page + sort persist in the URL.
  const listState = useListUrlState({
    allowedSorts: TICKET_SORTS,
    defaultSort: null,
    defaultDir: 'desc',
  });
  const currentPage = listState.state.page;
  const setCurrentPage = listState.setPage;

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  // Empty = the category's own default priority.
  const [newPriority, setNewPriority] = useState('');
  // QA #231 — optional single attachment per ticket. The picker
  // selects the File; on submit we upload via useUploadFileToS3 and
  // pass the resulting URL + display name into createTicket.
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [newAttachmentPercent, setNewAttachmentPercent] = useState<number | null>(null);
  const [newAttachmentFailed, setNewAttachmentFailed] = useState(false);

  // The dashboard's "Create New Request" button links here with ?new=1.
  useOpenOnNewParam(() => setCreateOpen(true));

  // Detail dialog: open while a request is chosen.
  const [selectedTicketId, setSelectedTicketId] = useState('');

  // Which queue is showing: every request, or only the overdue ones.
  const [activeQueueTab, setActiveQueueTab] = useState<QueueTab>('all');

  // Categories: the society's own list, or the legacy names from an older server.
  const categoriesQuery = useHelpdeskCategories();
  const legacyCategoriesQuery = useTicketCategories();
  const categories = categoryChoices(categoriesQuery.data, legacyCategoriesQuery.data);
  // Admins to assign to. The Setup screens need the same newer server, so
  // their link is offered only once it answers.
  const assigneesQuery = useHelpdeskAssignees();
  const setupAvailable = assigneesQuery.isSuccess;

  // Queries
  const ticketsQuery = useTickets({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    ...categoryFilterParams(categoryFilter),
    overdue: activeQueueTab === 'overdue' ? true : undefined,
    scope: activeQueueTab === 'open' || activeQueueTab === 'closed' ? activeQueueTab : undefined,
    page: currentPage,
    limit: PAGE_SIZE,
    sort: listState.state.sort ?? undefined,
    dir: listState.state.dir,
  });
  const statsQuery = useTicketStats();

  // Mutations
  const createMutation = useCreateTicket();
  const statusUpdate = useTicketStatusUpdate();
  const uploadAttachment = useUploadFileToS3();
  const bulkCloseMutation = useBulkCloseTickets();
  const bulkReassignMutation = useBulkReassignTickets();

  // Helpdesk queries
  const { data: helpdeskKpi } = useHelpdeskKpi();
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);

  // Clear selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [currentPage, statusFilter, priorityFilter, categoryFilter, activeQueueTab]);

  const rawTickets = ticketsQuery.data?.data ?? [];
  // The server filters; an older one ignores `overdue`, so the page keeps only
  // the rows it flagged overdue.
  const tickets =
    activeQueueTab === 'overdue' ? rawTickets.filter((t) => t.is_overdue === true) : rawTickets;
  const total = ticketsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stats = statsQuery.data;
  // Open / Closed tabs appear once the server counts them (HELP-12).
  const scopeCounts = ticketsQuery.data?.counts;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** The list filter: a category id, or a plain name from the legacy list. */
  function categoryFilterParams(choiceValue: string): { category_id?: string; category?: string } {
    if (!choiceValue) return {};
    const choice = categories.find((entry) => entry.value === choiceValue);
    return choice?.categoryId ? { category_id: choice.categoryId } : { category: choiceValue };
  }

  /** What to send for the category chosen in the New Ticket dialog. */
  function newCategoryFields(): { category_id?: string; category: string } {
    const choice = categories.find((entry) => entry.value === newCategory);
    // Both are sent: a server that knows categories files by id, an older one by name.
    return choice?.categoryId
      ? { category_id: choice.categoryId, category: choice.label }
      : { category: newCategory.trim() };
  }

  function handleViewTicket(ticket: Ticket): void {
    setSelectedTicketId(ticket.id);
  }

  async function handleCreateTicket(): Promise<void> {
    if (!newSubject.trim() || !newCategory.trim()) {
      addToast({ title: 'Subject and category are required', variant: 'destructive' });
      return;
    }

    // QA #231 — if the user picked an attachment, upload it via the
    // presigned-PUT flow first and then create the ticket with the
    // resulting URL + display name. The backend refuse-half-payload
    // refine() pass enforces "both or neither" so we never persist an
    // orphaned URL.
    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;
    if (newAttachment) {
      setNewAttachmentFailed(false);
      setNewAttachmentPercent(0);
      try {
        const result = await uploadAttachment.mutateAsync({
          file: newAttachment,
          onProgress: setNewAttachmentPercent,
        });
        attachmentUrl = result.fileUrl;
        attachmentName = newAttachment.name;
      } catch (err) {
        setNewAttachmentFailed(true);
        addToast({
          title: 'Attachment upload failed',
          description: (err as Error).message ?? 'Could not upload the attached file.',
          variant: 'destructive',
        });
        return;
      }
    }

    createMutation.mutate(
      {
        subject: newSubject.trim(),
        description: newDescription.trim() || undefined,
        ...newCategoryFields(),
        priority: newPriority || undefined,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      },
      {
        onSuccess() {
          addToast({ title: 'Ticket created successfully', variant: 'success' });
          setCreateOpen(false);
          setNewSubject('');
          setNewDescription('');
          setNewCategory('');
          setNewPriority('');
          setNewAttachment(null);
          setNewAttachmentPercent(null);
          setNewAttachmentFailed(false);
        },
        onError(error) {
          addToast({
            title: 'Failed to create ticket',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleUpdateStatus(ticketId: string, status: string): void {
    statusUpdate.update(ticketId, status);
  }

  function handleClearFilters(): void {
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
  }

  function toggleTicketSelection(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(): void {
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)));
    }
  }

  function handleBulkClose(): void {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkCloseMutation.mutate(
      { ticket_ids: ids },
      {
        onSuccess(result) {
          const closed = result.data?.closed ?? ids.length;
          addToast({ title: `${closed} ticket(s) closed`, variant: 'success' });
          setSelectedIds(new Set());
        },
        onError(error) {
          addToast({ title: 'Bulk close failed', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleBulkReassign(assigneeId: string): void {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !assigneeId) return;
    bulkReassignMutation.mutate(
      { ticket_ids: ids, assigned_to: assigneeId },
      {
        onSuccess() {
          addToast({ title: `${ids.length} ticket(s) reassigned`, variant: 'success' });
          setSelectedIds(new Set());
          setBulkReassignOpen(false);
        },
        onError(error) {
          addToast({ title: 'Bulk reassign failed', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Tickets' }]}
        title="Tickets"
        description="Track and resolve maintenance requests, complaints, and service issues"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              data={tickets.map((t) => ({ ...t, is_overdue: t.is_overdue ? 'Yes' : 'No' })) as unknown as Record<string, unknown>[]}
              filename={`tickets-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { key: 'ticket_number', label: 'Ticket #' },
                { key: 'subject', label: 'Title' },
                { key: 'category', label: 'Category' },
                { key: 'unit_number', label: 'Unit' },
                { key: 'created_by_name', label: 'Raised By' },
                { key: 'assigned_to_name', label: 'Assigned To' },
                { key: 'priority', label: 'Priority' },
                { key: 'status', label: 'Status' },
                { key: 'is_overdue', label: 'Overdue' },
                { key: 'created_at', label: 'Created' },
              ]}
            />
            <Button variant="outline" size="sm" onClick={() => setTemplatesModalOpen(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              Canned Templates
            </Button>
            {setupAvailable && (
              <Link href="/helpdesk/setup/categories" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Setup
              </Link>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsQuery.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Open</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{helpdeskKpi?.open_tickets ?? stats?.open ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {helpdeskKpi?.total_tickets ?? total} total society tickets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Breached</CardTitle>
                <Timer className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {helpdeskKpi?.sla_breached ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(helpdeskKpi?.sla_breached ?? 0) > 0 ? 'Exceeded resolution deadline' : 'Zero SLA breaches'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{helpdeskKpi?.avg_resolution_hours ?? 0} hrs</div>
                <p className="text-xs text-muted-foreground">Mean turnaround speed</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Queue tabs */}
      <QueueTabs
        active={activeQueueTab}
        onChange={setActiveQueueTab}
        totalCount={helpdeskKpi?.total_tickets ?? stats?.total ?? total}
        overdueCount={helpdeskKpi?.sla_breached ?? stats?.overdue ?? 0}
        scopeCounts={scopeCounts}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-status">Status</Label>
              <Select
                id="ticket-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="reopened">Reopened</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-priority">Priority</Label>
              <Select
                id="ticket-priority"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-category">Category</Label>
              <Select
                id="ticket-category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Tickets</CardTitle>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkClose}
                    disabled={bulkCloseMutation.isPending}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Bulk Close
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkReassignOpen(true)}
                  >
                    <UserCheck className="mr-1 h-4 w-4" />
                    Bulk Reassign
                  </Button>
                </>
              )}
              <p className="text-sm text-muted-foreground">{total} total</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-input"
                    checked={tickets.length > 0 && selectedIds.size === tickets.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all tickets"
                  />
                </TableHead>
                <TableHead>Ticket #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Days</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  </TableRow>
                ))
              ) : ticketsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-destructive">
                    Failed to load tickets —{' '}
                    {(ticketsQuery.error as Error)?.message ?? 'unknown error'}.{' '}
                    <Button
                      size="sm"
                      variant="link"
                      className="px-1 text-destructive underline"
                      onClick={() => ticketsQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer" onClick={() => handleViewTicket(ticket)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-input"
                        checked={selectedIds.has(ticket.id)}
                        onChange={() => toggleTicketSelection(ticket.id)}
                        aria-label={`Select ticket ${ticket.ticket_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {ticket.ticket_number}
                    </TableCell>
                    <TableCell className="font-medium max-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        {ticket.is_overdue && (
                          <span title="SLA overdue">
                            <Timer className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          </span>
                        )}
                        <span className="truncate">{ticket.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {ticket.category}
                    </TableCell>
                    <TableCell>{ticket.created_by_name ?? '—'}</TableCell>
                    <TableCell>{ticket.unit_number ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={priorityTone(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={statusTone(ticket.status)}>
                          {ticketStatusLabel(ticket.status, layout)}
                        </Badge>
                        {ticket.is_overdue && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">SLA</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.created_at)}
                    </TableCell>
                    <TableCell className="tabular-nums">{requestAgeDays(ticket)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewTicket(ticket); }}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          {ticket.status === 'open' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ticket.id, 'in_progress'); }}>
                              <Clock className="mr-2 h-4 w-4" /> Mark In Progress
                            </DropdownMenuItem>
                          )}
                          {ticket.status === 'in_progress' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ticket.id, 'resolved'); }}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Resolve
                            </DropdownMenuItem>
                          )}
                          {ticket.status === 'resolved' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateStatus(ticket.id, 'closed'); }}>
                              <XCircle className="mr-2 h-4 w-4" /> Close
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                    No tickets found
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
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create ticket dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Ticket</DialogTitle>
            <DialogDescription>
              Create a new maintenance request or complaint
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-subject">Subject</Label>
              <Input
                id="new-subject"
                placeholder="Brief description of the issue"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                placeholder="Detailed description (optional)"
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-category">Category</Label>
                <Select
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-priority">Priority</Label>
                <Select
                  id="new-priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <option value="">Category default</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>

            {/* QA #231 — optional single attachment per ticket. */}
            <div className="space-y-2">
              <Label htmlFor="new-attachment">Attachment (optional)</Label>
              <Input
                id="new-attachment"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setNewAttachment(file);
                  setNewAttachmentPercent(null);
                  setNewAttachmentFailed(false);
                }}
              />
              {newAttachment && (
                <p className="text-xs text-muted-foreground">
                  {newAttachment.name} — {(newAttachment.size / 1024).toFixed(1)} KB
                </p>
              )}
              <UploadProgress
                percent={newAttachmentPercent}
                fileName={newAttachment?.name}
                state={
                  newAttachmentFailed
                    ? 'error'
                    : newAttachmentPercent === 100
                      ? 'done'
                      : 'uploading'
                }
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={createMutation.isPending || uploadAttachment.isPending}
              onClick={handleCreateTicket}
            >
              {uploadAttachment.isPending
                ? 'Uploading...'
                : createMutation.isPending
                  ? 'Creating...'
                  : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TicketDetailDialog ticketId={selectedTicketId} onClose={() => setSelectedTicketId('')} />

      <BulkReassignDialog
        open={bulkReassignOpen}
        onOpenChange={setBulkReassignOpen}
        selectedCount={selectedIds.size}
        assignees={assigneesQuery.data ?? []}
        isPending={bulkReassignMutation.isPending}
        onSubmit={handleBulkReassign}
      />

      <CannedTemplatesDialog open={templatesModalOpen} onOpenChange={setTemplatesModalOpen} />
    </div>
  );
}
