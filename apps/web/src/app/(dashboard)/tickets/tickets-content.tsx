'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useTickets,
  useTicket,
  useTicketStats,
  useTicketCategories,
  useCreateTicket,
  useUpdateTicket,
  useAddTicketComment,
} from '@/hooks';
import type { Ticket, TicketComment } from '@/hooks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPriorityBadgeVariant(
  priority: string,
): 'secondary' | 'default' | 'warning' | 'destructive' {
  switch (priority) {
    case 'low':
      return 'secondary';
    case 'medium':
      return 'default';
    case 'high':
      return 'warning';
    case 'urgent':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getStatusBadgeVariant(
  status: string,
): 'warning' | 'default' | 'success' | 'secondary' | 'destructive' {
  switch (status) {
    case 'open':
      return 'warning';
    case 'in_progress':
      return 'default';
    case 'resolved':
      return 'success';
    case 'closed':
      return 'secondary';
    case 'reopened':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

export default function TicketsContent(): ReactNode {
  const { addToast } = useToast();
  const PAGE_SIZE = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  // Detail dialog
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');

  // Queries
  const ticketsQuery = useTickets({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    category: categoryFilter || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });
  const statsQuery = useTicketStats();
  const categoriesQuery = useTicketCategories();
  const ticketDetailQuery = useTicket(selectedTicketId);

  // Mutations
  const createMutation = useCreateTicket();
  const updateMutation = useUpdateTicket();
  const commentMutation = useAddTicketComment();

  const tickets = ticketsQuery.data?.data ?? [];
  const total = ticketsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stats = statsQuery.data;
  const categories = categoriesQuery.data ?? [];
  const detail = ticketDetailQuery.data;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleViewTicket(ticket: Ticket): void {
    setSelectedTicketId(ticket.id);
    setDetailOpen(true);
  }

  function handleCreateTicket(): void {
    if (!newSubject.trim() || !newCategory.trim()) {
      addToast({ title: 'Subject and category are required', variant: 'destructive' });
      return;
    }

    createMutation.mutate(
      {
        subject: newSubject.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory.trim(),
        priority: newPriority,
      },
      {
        onSuccess() {
          addToast({ title: 'Ticket created successfully', variant: 'success' });
          setCreateOpen(false);
          setNewSubject('');
          setNewDescription('');
          setNewCategory('');
          setNewPriority('medium');
        },
        onError(error) {
          addToast({
            title: 'Failed to create ticket',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleUpdateStatus(ticketId: string, status: string): void {
    updateMutation.mutate(
      { id: ticketId, status },
      {
        onSuccess() {
          addToast({ title: `Ticket updated to ${formatStatus(status)}`, variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to update ticket',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleAddComment(): void {
    if (!commentMessage.trim() || !selectedTicketId) return;

    commentMutation.mutate(
      { ticket_id: selectedTicketId, message: commentMessage.trim() },
      {
        onSuccess() {
          addToast({ title: 'Comment added', variant: 'success' });
          setCommentMessage('');
        },
        onError(error) {
          addToast({
            title: 'Failed to add comment',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleClearFilters(): void {
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Tickets' }]}
        title="Tickets"
        description="Manage maintenance requests and complaints"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsQuery.isLoading ? (
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
                <CardTitle className="text-sm font-medium">Open</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.open ?? 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting action</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.in_progress ?? 0}</div>
                <p className="text-xs text-muted-foreground">Being worked on</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.resolved ?? 0}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.closed ?? 0}</div>
                <p className="text-xs text-muted-foreground">Archived</p>
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
                  <option key={cat} value={cat}>
                    {cat}
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
            <p className="text-sm text-muted-foreground">{total} total</p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  </TableRow>
                ))
              ) : tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer" onClick={() => handleViewTicket(ticket)}>
                    <TableCell className="font-mono text-xs">
                      {ticket.ticket_number}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="capitalize">
                      {ticket.category}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        {formatStatus(ticket.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.created_at)}
                    </TableCell>
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
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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
                    <option key={cat} value={cat}>
                      {cat}
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
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={createMutation.isPending}
              onClick={handleCreateTicket}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) { setSelectedTicketId(''); setCommentMessage(''); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.ticket_number ?? 'Loading...'}
            </DialogTitle>
            <DialogDescription>
              {detail?.subject ?? ''}
            </DialogDescription>
          </DialogHeader>

          {ticketDetailQuery.isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-4 py-4">
              {/* Ticket info */}
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Status</span>
                <span>
                  <Badge variant={getStatusBadgeVariant(detail.status)}>
                    {formatStatus(detail.status)}
                  </Badge>
                </span>

                <span className="text-muted-foreground">Priority</span>
                <span>
                  <Badge variant={getPriorityBadgeVariant(detail.priority)}>
                    {detail.priority}
                  </Badge>
                </span>

                <span className="text-muted-foreground">Category</span>
                <span className="capitalize">{detail.category}</span>

                {detail.description && (
                  <>
                    <span className="text-muted-foreground">Description</span>
                    <span>{detail.description}</span>
                  </>
                )}

                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(detail.created_at)}</span>

                {detail.resolved_at && (
                  <>
                    <span className="text-muted-foreground">Resolved</span>
                    <span>{formatDate(detail.resolved_at)}</span>
                  </>
                )}

                {detail.sla_due_at && (
                  <>
                    <span className="text-muted-foreground">SLA Due</span>
                    <span>{formatDate(detail.sla_due_at)}</span>
                  </>
                )}
              </div>

              {/* Status actions */}
              <div className="flex gap-2">
                {detail.status === 'open' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={() => handleUpdateStatus(detail.id, 'in_progress')}
                  >
                    <Clock className="mr-2 h-4 w-4" /> Mark In Progress
                  </Button>
                )}
                {detail.status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={() => handleUpdateStatus(detail.id, 'resolved')}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Resolve
                  </Button>
                )}
                {detail.status === 'resolved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={() => handleUpdateStatus(detail.id, 'closed')}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Close
                  </Button>
                )}
              </div>

              <Separator />

              {/* Add comment */}
              <div className="space-y-2">
                <Label htmlFor="comment-message">Add Comment</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="comment-message"
                    placeholder="Type a comment..."
                    rows={2}
                    value={commentMessage}
                    onChange={(e) => setCommentMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={commentMutation.isPending || !commentMessage.trim()}
                    onClick={handleAddComment}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
