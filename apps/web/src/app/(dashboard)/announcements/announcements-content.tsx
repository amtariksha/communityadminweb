'use client';

import { useState, type ReactNode } from 'react';
import {
  Megaphone,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pin,
  Edit,
  Trash2,
  Send,
  MoreHorizontal,
  Eye,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  usePublishAnnouncement,
  useDeleteAnnouncement,
} from '@/hooks';
import type { Announcement } from '@/hooks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPriorityBadgeVariant(
  priority: string,
): 'secondary' | 'default' | 'warning' | 'destructive' {
  switch (priority) {
    case 'low':
      return 'secondary';
    case 'normal':
      return 'default';
    case 'high':
      return 'warning';
    case 'urgent':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getPublishStatus(announcement: Announcement): { label: string; variant: 'success' | 'warning' | 'secondary' } {
  if (announcement.published_at) {
    if (announcement.expires_at && new Date(announcement.expires_at) < new Date()) {
      return { label: 'Expired', variant: 'secondary' };
    }
    return { label: 'Published', variant: 'success' };
  }
  return { label: 'Draft', variant: 'warning' };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnnouncementsContent(): ReactNode {
  const { addToast } = useToast();
  const PAGE_SIZE = 20;

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Create / edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formPriority, setFormPriority] = useState('normal');
  const [formTargetAudience, setFormTargetAudience] = useState('all');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formPublishNow, setFormPublishNow] = useState(true);
  const [formExpiresAt, setFormExpiresAt] = useState('');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  // Queries
  const announcementsQuery = useAnnouncements({
    category: categoryFilter || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  // Mutations
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const publishMutation = usePublishAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const announcements = announcementsQuery.data?.data ?? [];
  const total = announcementsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Sort pinned first
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function resetForm(): void {
    setEditingId('');
    setFormTitle('');
    setFormBody('');
    setFormCategory('general');
    setFormPriority('normal');
    setFormTargetAudience('all');
    setFormIsPinned(false);
    setFormPublishNow(true);
    setFormExpiresAt('');
  }

  function handleOpenCreate(): void {
    resetForm();
    setFormOpen(true);
  }

  function handleOpenEdit(announcement: Announcement): void {
    setEditingId(announcement.id);
    setFormTitle(announcement.title);
    setFormBody(announcement.body);
    setFormCategory(announcement.category);
    setFormPriority(announcement.priority);
    setFormTargetAudience(announcement.target_audience);
    setFormIsPinned(announcement.is_pinned);
    setFormPublishNow(false);
    setFormExpiresAt(announcement.expires_at ?? '');
    setFormOpen(true);
  }

  function handleSubmitForm(): void {
    if (!formTitle.trim() || !formBody.trim()) {
      addToast({ title: 'Title and body are required', variant: 'destructive' });
      return;
    }

    const payload = {
      title: formTitle.trim(),
      body: formBody.trim(),
      category: formCategory,
      priority: formPriority,
      target_audience: formTargetAudience,
      is_pinned: formIsPinned,
      expires_at: formExpiresAt || undefined,
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, ...payload },
        {
          onSuccess() {
            addToast({ title: 'Announcement updated', variant: 'success' });
            setFormOpen(false);
            resetForm();
          },
          onError(error) {
            addToast({
              title: 'Failed to update announcement',
              description: friendlyError(error),
              variant: 'destructive',
            });
          },
        },
      );
    } else {
      createMutation.mutate(
        { ...payload, publish_now: formPublishNow },
        {
          onSuccess() {
            addToast({ title: 'Announcement created', variant: 'success' });
            setFormOpen(false);
            resetForm();
          },
          onError(error) {
            addToast({
              title: 'Failed to create announcement',
              description: friendlyError(error),
              variant: 'destructive',
            });
          },
        },
      );
    }
  }

  function handlePublish(id: string): void {
    publishMutation.mutate(
      { id },
      {
        onSuccess() {
          addToast({ title: 'Announcement published', variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to publish announcement',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleConfirmDelete(): void {
    if (!deleteTargetId) return;

    deleteMutation.mutate(
      { id: deleteTargetId },
      {
        onSuccess() {
          addToast({ title: 'Announcement deleted', variant: 'success' });
          setDeleteOpen(false);
          setDeleteTargetId('');
        },
        onError(error) {
          addToast({
            title: 'Failed to delete announcement',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleViewDetail(announcement: Announcement): void {
    setSelectedAnnouncement(announcement);
    setDetailOpen(true);
  }

  function handleClearFilters(): void {
    setCategoryFilter('');
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Announcements' }]}
        title="Announcements"
        description="Create and publish announcements to residents — supports targeting by audience"
        actions={
          <>
            <ExportButton
              data={announcements as unknown as Record<string, unknown>[]}
              filename={`announcements-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'priority', label: 'Priority' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Created' },
                { key: 'published_at', label: 'Published' },
              ]}
            />
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Announcement
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-category">Category</Label>
              <Select
                id="announcement-category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All</option>
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="security">Security</option>
                <option value="event">Event</option>
                <option value="emergency">Emergency</option>
              </Select>
            </div>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Announcements table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Announcements
            </CardTitle>
            <p className="text-sm text-muted-foreground">{total} total</p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcementsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  </TableRow>
                ))
              ) : sortedAnnouncements.length > 0 ? (
                sortedAnnouncements.map((announcement) => {
                  const publishStatus = getPublishStatus(announcement);
                  return (
                    <TableRow key={announcement.id} className="cursor-pointer" onClick={() => handleViewDetail(announcement)}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        <span className="flex items-center gap-2">
                          {announcement.is_pinned && <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                          {announcement.title}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">
                        {announcement.category}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeVariant(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {announcement.target_audience}
                      </TableCell>
                      <TableCell>
                        <Badge variant={publishStatus.variant}>
                          {publishStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(announcement.created_at)}
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetail(announcement); }}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenEdit(announcement); }}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {!announcement.published_at && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePublish(announcement.id); }}>
                                <Send className="mr-2 h-4 w-4" /> Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTargetId(announcement.id);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No announcements found
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

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the announcement details' : 'Create a new community announcement'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="form-title">Title</Label>
              <Input
                id="form-title"
                placeholder="Announcement title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-body">Body</Label>
              <Textarea
                id="form-body"
                placeholder="Announcement content"
                rows={4}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-category">Category</Label>
                <Select
                  id="form-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="security">Security</option>
                  <option value="event">Event</option>
                  <option value="emergency">Emergency</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-priority">Priority</Label>
                <Select
                  id="form-priority"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-audience">Target Audience</Label>
                <Select
                  id="form-audience"
                  value={formTargetAudience}
                  onChange={(e) => setFormTargetAudience(e.target.value)}
                >
                  <option value="all">All Residents</option>
                  <option value="owners">Owners</option>
                  <option value="tenants">Tenants</option>
                  <option value="committee">Committee</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-expires">Expires At</Label>
                <Input
                  id="form-expires"
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="rounded border-input"
                />
                Pin announcement
              </label>

              {!editingId && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formPublishNow}
                    onChange={(e) => setFormPublishNow(e.target.checked)}
                    className="rounded border-input"
                  />
                  Publish immediately
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmitForm}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? 'Saving...'
                : editingId
                  ? 'Update'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedAnnouncement(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement?.title ?? ''}</DialogTitle>
            <DialogDescription>
              {selectedAnnouncement?.author_name
                ? `By ${selectedAnnouncement.author_name}`
                : selectedAnnouncement?.created_at
                  ? `Created ${formatDate(selectedAnnouncement.created_at)}`
                  : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedAnnouncement && (
            <div className="space-y-4 py-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={getPriorityBadgeVariant(selectedAnnouncement.priority)}>
                  {selectedAnnouncement.priority}
                </Badge>
                <Badge variant={getPublishStatus(selectedAnnouncement).variant}>
                  {getPublishStatus(selectedAnnouncement).label}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {selectedAnnouncement.category}
                </Badge>
                {selectedAnnouncement.is_pinned && (
                  <Badge variant="secondary">
                    <Pin className="mr-1 h-3 w-3" /> Pinned
                  </Badge>
                )}
              </div>

              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {selectedAnnouncement.body}
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Audience</span>
                <span className="capitalize">{selectedAnnouncement.target_audience}</span>

                {selectedAnnouncement.target_blocks && selectedAnnouncement.target_blocks.length > 0 && (
                  <>
                    <span className="text-muted-foreground">Blocks</span>
                    <span>{selectedAnnouncement.target_blocks.join(', ')}</span>
                  </>
                )}

                {selectedAnnouncement.published_at && (
                  <>
                    <span className="text-muted-foreground">Published</span>
                    <span>{formatDate(selectedAnnouncement.published_at)}</span>
                  </>
                )}

                {selectedAnnouncement.expires_at && (
                  <>
                    <span className="text-muted-foreground">Expires</span>
                    <span>{formatDate(selectedAnnouncement.expires_at)}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
