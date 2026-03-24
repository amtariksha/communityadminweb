'use client';

import { useState, type ReactNode } from 'react';
import {
  Plus,
  BarChart3,
  CheckCircle2,
  Vote,
  XCircle,
  Eye,
  Trash2,
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
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  usePolls,
  useActivePolls,
  usePoll,
  useCreatePoll,
  useClosePoll,
} from '@/hooks';
import type { Poll } from '@/hooks/use-voting';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POLL_TYPES = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
] as const;

const VOTE_AUDIENCES = [
  { value: 'all_members', label: 'All Members' },
  { value: 'owners_only', label: 'Owners Only' },
  { value: 'tenants_only', label: 'Tenants Only' },
  { value: 'committee_only', label: 'Committee Only' },
] as const;

const ONE_VOTE_PER = [
  { value: 'member', label: 'Per Member' },
  { value: 'unit', label: 'Per Unit' },
] as const;

function pollStatusVariant(
  status: string,
): 'success' | 'warning' | 'secondary' | 'destructive' {
  switch (status) {
    case 'active':
      return 'success';
    case 'draft':
      return 'warning';
    case 'closed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function pollTypeLabel(type: string): string {
  const found = POLL_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VotingContent(): ReactNode {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState('');

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('yes_no');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [newVotingStart, setNewVotingStart] = useState('');
  const [newVotingEnd, setNewVotingEnd] = useState('');
  const [newWhoCanVote, setNewWhoCanVote] = useState('all_members');
  const [newOneVotePer, setNewOneVotePer] = useState('member');

  // Queries
  const pollsQuery = usePolls(statusFilter || undefined);
  const activeQuery = useActivePolls();
  const pollDetailQuery = usePoll(selectedPollId);

  // Mutations
  const createMutation = useCreatePoll();
  const closeMutation = useClosePoll();

  const polls = pollsQuery.data?.data ?? [];
  const totalPolls = pollsQuery.data?.total ?? 0;
  const activePolls = activeQuery.data ?? [];
  const pollDetail = pollDetailQuery.data;

  // Derive stats
  const closedCount = polls.filter((p) => p.status === 'closed').length;
  const totalVotesCount = polls.reduce((sum, p) => sum + (p.total_votes ?? 0), 0);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleAddOption(): void {
    setNewOptions([...newOptions, '']);
  }

  function handleRemoveOption(index: number): void {
    if (newOptions.length <= 2) return;
    setNewOptions(newOptions.filter((_, i) => i !== index));
  }

  function handleOptionChange(index: number, value: string): void {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  }

  function handleCreate(): void {
    if (!newTitle.trim()) {
      addToast({ title: 'Poll title is required', variant: 'destructive' });
      return;
    }
    if (!newVotingStart || !newVotingEnd) {
      addToast({ title: 'Voting start and end dates are required', variant: 'destructive' });
      return;
    }

    const filteredOptions = newOptions.filter((o) => o.trim() !== '');
    if (newType !== 'yes_no' && filteredOptions.length < 2) {
      addToast({ title: 'At least 2 options are required', variant: 'destructive' });
      return;
    }

    const options =
      newType === 'yes_no' ? ['Yes', 'No'] : filteredOptions;

    createMutation.mutate(
      {
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        type: newType,
        options,
        voting_start: newVotingStart,
        voting_end: newVotingEnd,
        who_can_vote: newWhoCanVote,
        one_vote_per: newOneVotePer,
      },
      {
        onSuccess() {
          addToast({ title: 'Poll created', variant: 'success' });
          setCreateOpen(false);
          resetCreateForm();
        },
        onError(error) {
          addToast({ title: 'Failed to create poll', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function resetCreateForm(): void {
    setNewTitle('');
    setNewDescription('');
    setNewType('yes_no');
    setNewOptions(['', '']);
    setNewVotingStart('');
    setNewVotingEnd('');
    setNewWhoCanVote('all_members');
    setNewOneVotePer('member');
  }

  function handleClose(poll: Poll): void {
    closeMutation.mutate(poll.id, {
      onSuccess() {
        addToast({ title: `Poll "${poll.title}" closed`, variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to close poll', description: error.message, variant: 'destructive' });
      },
    });
  }

  function handleViewDetail(poll: Poll): void {
    setSelectedPollId(poll.id);
    setDetailOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Voting' }]}
        title="Voting & Polls"
        description="Create and manage polls for society decisions"
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {pollsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Polls</CardTitle>
                <BarChart3 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activePolls.length}</div>
                <p className="text-xs text-muted-foreground">Currently accepting votes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed Polls</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{closedCount}</div>
                <p className="text-xs text-muted-foreground">Completed polls</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                <Vote className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVotesCount}</div>
                <p className="text-xs text-muted-foreground">Across all polls</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Polls table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Polls</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Poll
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pollsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : polls.length > 0 ? (
                polls.map((poll) => (
                  <TableRow key={poll.id}>
                    <TableCell className="font-medium">{poll.title}</TableCell>
                    <TableCell>{pollTypeLabel(poll.type)}</TableCell>
                    <TableCell>
                      <Badge variant={pollStatusVariant(poll.status)}>
                        {poll.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{poll.total_votes}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(poll.voting_start)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(poll.voting_end)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewDetail(poll)}
                          title="View results"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {poll.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleClose(poll)}
                            title="Close poll"
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No polls found. Create a poll to start collecting votes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create poll dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Poll</DialogTitle>
            <DialogDescription>Create a new poll for society members to vote on</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="poll-title">Title</Label>
              <Input
                id="poll-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Should we install solar panels?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-description">Description (optional)</Label>
              <Textarea
                id="poll-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Provide additional context for voters..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poll-type">Poll Type</Label>
                <Select
                  id="poll-type"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  {POLL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-audience">Who Can Vote</Label>
                <Select
                  id="poll-audience"
                  value={newWhoCanVote}
                  onChange={(e) => setNewWhoCanVote(e.target.value)}
                >
                  {VOTE_AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Options builder (hidden for yes_no) */}
            {newType !== 'yes_no' && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {newOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {newOptions.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => handleRemoveOption(index)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    type="button"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Option
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poll-start">Voting Start</Label>
                <Input
                  id="poll-start"
                  type="datetime-local"
                  value={newVotingStart}
                  onChange={(e) => setNewVotingStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-end">Voting End</Label>
                <Input
                  id="poll-end"
                  type="datetime-local"
                  value={newVotingEnd}
                  onChange={(e) => setNewVotingEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-one-vote-per">One Vote Per</Label>
              <Select
                id="poll-one-vote-per"
                value={newOneVotePer}
                onChange={(e) => setNewOneVotePer(e.target.value)}
              >
                {ONE_VOTE_PER.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Poll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Poll detail / results dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Poll Results</DialogTitle>
            <DialogDescription>
              {pollDetail?.poll?.title ?? 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {pollDetailQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : pollDetail ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Total votes: {pollDetail.total_votes}</span>
                  <span>Participation: {(pollDetail.participation_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="space-y-3">
                  {pollDetail.options.map((option) => (
                    <div key={option.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-muted-foreground">
                          {option.votes} vote{option.votes !== 1 ? 's' : ''} ({option.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted">
                        <div
                          className="h-3 rounded-full bg-primary transition-all"
                          style={{ width: `${option.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Status: <Badge variant={pollStatusVariant(pollDetail.poll.status)} className="ml-1">{pollDetail.poll.status}</Badge></p>
                  <p>Voting period: {formatDate(pollDetail.poll.voting_start)} - {formatDate(pollDetail.poll.voting_end)}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Poll not found</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
