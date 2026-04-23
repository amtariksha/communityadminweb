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
  Gavel,
  Users2,
  FileText,
  Send,
  Ban,
  ClipboardList,
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
import { friendlyError } from '@/lib/api-error';
import {
  usePolls,
  useActivePolls,
  usePoll,
  useCreatePoll,
  useClosePoll,
  useResolutions,
  useCreateResolution,
  useProposeResolution,
  useWithdrawResolution,
  useElections,
  useCreateElection,
  useCloseElection,
  useRecordMinutes,
} from '@/hooks';
import type { Poll } from '@/hooks/use-voting';
import type { Resolution, Election } from '@/hooks/use-governance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type VotingTab = 'polls' | 'resolutions' | 'elections';

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

const RESOLUTION_TYPES = [
  { value: 'ordinary', label: 'Ordinary' },
  { value: 'special', label: 'Special' },
] as const;

const MEETING_TYPES = [
  { value: 'agm', label: 'AGM' },
  { value: 'sgm', label: 'SGM' },
  { value: 'committee', label: 'Committee Meeting' },
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

function resolutionStatusVariant(
  status: string,
): 'success' | 'warning' | 'secondary' | 'destructive' {
  switch (status) {
    case 'passed':
      return 'success';
    case 'draft':
      return 'warning';
    case 'proposed':
    case 'voting':
      return 'secondary';
    case 'rejected':
    case 'withdrawn':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function electionStatusVariant(
  status: string,
): 'success' | 'warning' | 'secondary' | 'destructive' {
  switch (status) {
    case 'active':
    case 'voting':
      return 'success';
    case 'nominations_open':
      return 'warning';
    case 'completed':
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
  const [activeTab, setActiveTab] = useState<VotingTab>('polls');

  // -- Poll state --
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('yes_no');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [newVotingStart, setNewVotingStart] = useState('');
  const [newVotingEnd, setNewVotingEnd] = useState('');
  const [newWhoCanVote, setNewWhoCanVote] = useState('all_members');
  const [newOneVotePer, setNewOneVotePer] = useState('member');

  // -- Resolution state --
  const [resStatusFilter, setResStatusFilter] = useState('');
  const [createResOpen, setCreateResOpen] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resBody, setResBody] = useState('');
  const [resType, setResType] = useState<'ordinary' | 'special'>('ordinary');
  const [resQuorum, setResQuorum] = useState('51');
  const [resMeetingDate, setResMeetingDate] = useState('');
  const [resMeetingType, setResMeetingType] = useState('agm');

  // -- Election state --
  const [elStatusFilter, setElStatusFilter] = useState('');
  const [createElOpen, setCreateElOpen] = useState(false);
  const [elTitle, setElTitle] = useState('');
  const [elDescription, setElDescription] = useState('');
  const [elPositions, setElPositions] = useState<Array<{ title: string; seats: number }>>([
    { title: '', seats: 1 },
  ]);
  const [elNomStart, setElNomStart] = useState('');
  const [elNomEnd, setElNomEnd] = useState('');
  const [elVoteStart, setElVoteStart] = useState('');
  const [elVoteEnd, setElVoteEnd] = useState('');

  // -- Record Minutes state --
  const [recordMinutesOpen, setRecordMinutesOpen] = useState(false);
  const [recordMinutesResId, setRecordMinutesResId] = useState('');
  const [recordMinutesText, setRecordMinutesText] = useState('');

  // -- Queries --
  const pollsQuery = usePolls(statusFilter || undefined);
  const activeQuery = useActivePolls();
  const pollDetailQuery = usePoll(selectedPollId);
  const resolutionsQuery = useResolutions(resStatusFilter || undefined);
  const electionsQuery = useElections(elStatusFilter || undefined);

  // -- Mutations --
  const createMutation = useCreatePoll();
  const closeMutation = useClosePoll();
  const createResMutation = useCreateResolution();
  const proposeResMutation = useProposeResolution();
  const withdrawResMutation = useWithdrawResolution();
  const recordMinutesMutation = useRecordMinutes();
  const createElMutation = useCreateElection();
  const closeElMutation = useCloseElection();

  // -- Derived data --
  const polls = pollsQuery.data?.data ?? [];
  const activePolls = activeQuery.data ?? [];
  const pollDetail = pollDetailQuery.data;
  const resolutions = resolutionsQuery.data?.data ?? [];
  const elections = electionsQuery.data?.data ?? [];
  const closedCount = polls.filter((p) => p.status === 'closed').length;
  const totalVotesCount = polls.reduce((sum, p) => sum + (p.total_votes ?? 0), 0);

  // ---------------------------------------------------------------------------
  // Poll handlers
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

    const rawOptions = newType === 'yes_no' ? ['Yes', 'No'] : filteredOptions;
    const options = rawOptions.map((label) => ({ label }));

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
          addToast({ title: 'Failed to create poll', description: friendlyError(error), variant: 'destructive' });
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
        addToast({ title: 'Failed to close poll', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function handleViewDetail(poll: Poll): void {
    setSelectedPollId(poll.id);
    setDetailOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Resolution handlers
  // ---------------------------------------------------------------------------

  function resetResForm(): void {
    setResTitle('');
    setResBody('');
    setResType('ordinary');
    setResQuorum('51');
    setResMeetingDate('');
    setResMeetingType('agm');
  }

  function handleCreateResolution(): void {
    if (!resTitle.trim()) {
      addToast({ title: 'Resolution title is required', variant: 'destructive' });
      return;
    }
    if (!resMeetingDate) {
      addToast({ title: 'Meeting date is required', variant: 'destructive' });
      return;
    }

    createResMutation.mutate(
      {
        title: resTitle.trim(),
        body: resBody.trim(),
        resolution_type: resType,
        quorum_required: Number(resQuorum),
        meeting_date: resMeetingDate,
        meeting_type: resMeetingType,
      },
      {
        onSuccess() {
          addToast({ title: 'Resolution created', variant: 'success' });
          setCreateResOpen(false);
          resetResForm();
        },
        onError(error) {
          addToast({ title: 'Failed to create resolution', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleProposeResolution(res: Resolution): void {
    proposeResMutation.mutate(res.id, {
      onSuccess() {
        addToast({ title: 'Resolution proposed', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to propose', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function handleWithdrawResolution(res: Resolution): void {
    withdrawResMutation.mutate(res.id, {
      onSuccess() {
        addToast({ title: 'Resolution withdrawn', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to withdraw', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function handleOpenRecordMinutes(res: Resolution): void {
    setRecordMinutesResId(res.id);
    setRecordMinutesText('');
    setRecordMinutesOpen(true);
  }

  function handleRecordMinutes(): void {
    if (!recordMinutesText.trim()) {
      addToast({ title: 'Minutes text is required', variant: 'destructive' });
      return;
    }
    recordMinutesMutation.mutate(
      { id: recordMinutesResId, minutes: recordMinutesText.trim() },
      {
        onSuccess() {
          addToast({ title: 'Minutes recorded', variant: 'success' });
          setRecordMinutesOpen(false);
          setRecordMinutesText('');
          setRecordMinutesResId('');
        },
        onError(error) {
          addToast({ title: 'Failed to record minutes', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Election handlers
  // ---------------------------------------------------------------------------

  function resetElForm(): void {
    setElTitle('');
    setElDescription('');
    setElPositions([{ title: '', seats: 1 }]);
    setElNomStart('');
    setElNomEnd('');
    setElVoteStart('');
    setElVoteEnd('');
  }

  function handleAddPosition(): void {
    setElPositions([...elPositions, { title: '', seats: 1 }]);
  }

  function handleRemovePosition(index: number): void {
    if (elPositions.length <= 1) return;
    setElPositions(elPositions.filter((_, i) => i !== index));
  }

  function handlePositionChange(index: number, field: 'title' | 'seats', value: string): void {
    const updated = elPositions.map((pos, i) => {
      if (i !== index) return pos;
      if (field === 'seats') return { ...pos, seats: Number(value) || 1 };
      return { ...pos, [field]: value };
    });
    setElPositions(updated);
  }

  function handleCreateElection(): void {
    if (!elTitle.trim()) {
      addToast({ title: 'Election title is required', variant: 'destructive' });
      return;
    }
    const validPositions = elPositions.filter((p) => p.title.trim() !== '');
    if (validPositions.length === 0) {
      addToast({ title: 'At least one position is required', variant: 'destructive' });
      return;
    }

    createElMutation.mutate(
      {
        title: elTitle.trim(),
        description: elDescription.trim(),
        positions: validPositions.map((p) => ({ title: p.title.trim(), seats: p.seats })),
        nomination_start: elNomStart,
        nomination_end: elNomEnd,
        voting_start: elVoteStart,
        voting_end: elVoteEnd,
      },
      {
        onSuccess() {
          addToast({ title: 'Election created', variant: 'success' });
          setCreateElOpen(false);
          resetElForm();
        },
        onError(error) {
          addToast({ title: 'Failed to create election', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleCloseElection(el: Election): void {
    closeElMutation.mutate(el.id, {
      onSuccess() {
        addToast({ title: 'Election closed', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to close election', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Tab render functions
  // ---------------------------------------------------------------------------

  function renderPollsTab(): ReactNode {
    return (
      <>
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
                        <Badge variant={pollStatusVariant(poll.status)}>{poll.status}</Badge>
                      </TableCell>
                      <TableCell>{poll.total_votes}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(poll.voting_start)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(poll.voting_end)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewDetail(poll)} title="View results">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {poll.status === 'active' && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleClose(poll)} title="Close poll">
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
      </>
    );
  }

  function renderResolutionsTab(): ReactNode {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resolutions</CardTitle>
              <div className="flex items-center gap-3">
                <Select value={resStatusFilter} onChange={(e) => setResStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="proposed">Proposed</option>
                  <option value="voting">Voting</option>
                  <option value="passed">Passed</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </Select>
                <Button onClick={() => setCreateResOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Resolution
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
                  <TableHead>Votes (For/Against/Abstain)</TableHead>
                  <TableHead>Meeting Date</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolutionsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : resolutions.length > 0 ? (
                  resolutions.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{res.title}</p>
                          {res.resolution_number && (
                            <p className="text-xs text-muted-foreground">#{res.resolution_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{res.resolution_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={resolutionStatusVariant(res.status)}>{res.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{res.votes_for}</span>
                        {' / '}
                        <span className="text-red-600">{res.votes_against}</span>
                        {' / '}
                        <span className="text-muted-foreground">{res.votes_abstain}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(res.meeting_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {res.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleProposeResolution(res)}
                              title="Propose"
                              disabled={proposeResMutation.isPending}
                            >
                              <Send className="h-4 w-4 text-blue-500" />
                            </Button>
                          )}
                          {(res.status === 'draft' || res.status === 'proposed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleWithdrawResolution(res)}
                              title="Withdraw"
                              disabled={withdrawResMutation.isPending}
                            >
                              <Ban className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          {res.status === 'passed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenRecordMinutes(res)}
                              title="Record Minutes"
                            >
                              <ClipboardList className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No resolutions found. Create a resolution for society governance.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
    );
  }

  function renderElectionsTab(): ReactNode {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Elections</CardTitle>
              <div className="flex items-center gap-3">
                <Select value={elStatusFilter} onChange={(e) => setElStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="nominations_open">Nominations Open</option>
                  <option value="voting">Voting</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                <Button onClick={() => setCreateElOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Election
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Positions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nominations</TableHead>
                  <TableHead>Voting Period</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {electionsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : elections.length > 0 ? (
                  elections.map((el) => (
                    <TableRow key={el.id}>
                      <TableCell className="font-medium">{el.title}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {el.positions.map((pos, i) => (
                            <div key={i} className="text-xs">
                              {pos.title} <span className="text-muted-foreground">({pos.seats} seat{pos.seats > 1 ? 's' : ''})</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={electionStatusVariant(el.status)}>{el.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(el.nomination_start)} - {formatDate(el.nomination_end)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(el.voting_start)} - {formatDate(el.voting_end)}
                      </TableCell>
                      <TableCell>
                        {(el.status === 'active' || el.status === 'voting' || el.status === 'nominations_open') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleCloseElection(el)}
                            title="Close election"
                            disabled={closeElMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No elections found. Create an election for committee positions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const tabs: { key: VotingTab; label: string }[] = [
    { key: 'polls', label: 'Polls' },
    { key: 'resolutions', label: 'Resolutions' },
    { key: 'elections', label: 'Elections' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Voting' }]}
        title="Voting & Governance"
        description="Manage polls, resolutions, and elections for society decisions"
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'polls' && renderPollsTab()}
      {activeTab === 'resolutions' && renderResolutionsTab()}
      {activeTab === 'elections' && renderElectionsTab()}

      {/* ================================================================= */}
      {/* Create poll dialog                                                 */}
      {/* ================================================================= */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Poll</DialogTitle>
            <DialogDescription>Create a new poll for society members to vote on</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="poll-title">Title</Label>
              <Input id="poll-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Should we install solar panels?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-description">Description (optional)</Label>
              <Textarea id="poll-description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Provide additional context for voters..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poll-type">Poll Type</Label>
                <Select id="poll-type" value={newType} onChange={(e) => setNewType(e.target.value)}>
                  {POLL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-audience">Who Can Vote</Label>
                <Select id="poll-audience" value={newWhoCanVote} onChange={(e) => setNewWhoCanVote(e.target.value)}>
                  {VOTE_AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            {newType !== 'yes_no' && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {newOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={option} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                      {newOptions.length > 2 && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => handleRemoveOption(index)} type="button">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddOption} type="button">
                    <Plus className="mr-2 h-4 w-4" /> Add Option
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poll-start">Voting Start</Label>
                <Input id="poll-start" type="datetime-local" value={newVotingStart} onChange={(e) => setNewVotingStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-end">Voting End</Label>
                <Input id="poll-end" type="datetime-local" value={newVotingEnd} onChange={(e) => setNewVotingEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-one-vote-per">One Vote Per</Label>
              <Select id="poll-one-vote-per" value={newOneVotePer} onChange={(e) => setNewOneVotePer(e.target.value)}>
                {ONE_VOTE_PER.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Poll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Poll detail / results dialog                                      */}
      {/* ================================================================= */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Poll Results</DialogTitle>
            <DialogDescription>{pollDetail?.poll?.title ?? 'Loading...'}</DialogDescription>
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
                        <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${option.percentage}%` }} />
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
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Create resolution dialog                                          */}
      {/* ================================================================= */}
      <Dialog open={createResOpen} onOpenChange={setCreateResOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Resolution</DialogTitle>
            <DialogDescription>Draft a new resolution for society governance</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="res-title">Title</Label>
              <Input id="res-title" value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="e.g. Approval of annual budget 2026-27" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-body">Resolution Body</Label>
              <Textarea id="res-body" value={resBody} onChange={(e) => setResBody(e.target.value)} placeholder="Full text of the resolution..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="res-type">Type</Label>
                <Select id="res-type" value={resType} onChange={(e) => setResType(e.target.value as 'ordinary' | 'special')}>
                  {RESOLUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-quorum">Quorum Required (%)</Label>
                <Input id="res-quorum" type="number" min="1" max="100" value={resQuorum} onChange={(e) => setResQuorum(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="res-meeting-date">Meeting Date</Label>
                <Input id="res-meeting-date" type="date" value={resMeetingDate} onChange={(e) => setResMeetingDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-meeting-type">Meeting Type</Label>
                <Select id="res-meeting-type" value={resMeetingType} onChange={(e) => setResMeetingType(e.target.value)}>
                  {MEETING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateResolution} disabled={createResMutation.isPending}>
              {createResMutation.isPending ? 'Creating...' : 'Create Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Create election dialog                                            */}
      {/* ================================================================= */}
      <Dialog open={createElOpen} onOpenChange={setCreateElOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Election</DialogTitle>
            <DialogDescription>Set up a new election for committee positions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="el-title">Title</Label>
              <Input id="el-title" value={elTitle} onChange={(e) => setElTitle(e.target.value)} placeholder="e.g. Committee Election 2026-27" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="el-description">Description</Label>
              <Textarea id="el-description" value={elDescription} onChange={(e) => setElDescription(e.target.value)} placeholder="Election details..." rows={3} />
            </div>

            {/* Positions builder */}
            <div className="space-y-2">
              <Label>Positions</Label>
              <div className="space-y-2">
                {elPositions.map((pos, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={pos.title} onChange={(e) => handlePositionChange(index, 'title', e.target.value)} placeholder="Position title" className="flex-1" />
                    <Input type="number" min="1" value={String(pos.seats)} onChange={(e) => handlePositionChange(index, 'seats', e.target.value)} className="w-20" placeholder="Seats" />
                    {elPositions.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => handleRemovePosition(index)} type="button">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddPosition} type="button">
                  <Plus className="mr-2 h-4 w-4" /> Add Position
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="el-nom-start">Nomination Start</Label>
                <Input id="el-nom-start" type="datetime-local" value={elNomStart} onChange={(e) => setElNomStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="el-nom-end">Nomination End</Label>
                <Input id="el-nom-end" type="datetime-local" value={elNomEnd} onChange={(e) => setElNomEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="el-vote-start">Voting Start</Label>
                <Input id="el-vote-start" type="datetime-local" value={elVoteStart} onChange={(e) => setElVoteStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="el-vote-end">Voting End</Label>
                <Input id="el-vote-end" type="datetime-local" value={elVoteEnd} onChange={(e) => setElVoteEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateElection} disabled={createElMutation.isPending}>
              {createElMutation.isPending ? 'Creating...' : 'Create Election'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Record Minutes dialog                                             */}
      {/* ================================================================= */}
      <Dialog open={recordMinutesOpen} onOpenChange={setRecordMinutesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Minutes</DialogTitle>
            <DialogDescription>Record the official meeting minutes for this passed resolution</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="minutes-text">Minutes</Label>
              <Textarea
                id="minutes-text"
                value={recordMinutesText}
                onChange={(e) => setRecordMinutesText(e.target.value)}
                placeholder="Enter the official minutes of the meeting..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleRecordMinutes} disabled={recordMinutesMutation.isPending}>
              {recordMinutesMutation.isPending ? 'Saving...' : 'Save Minutes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
