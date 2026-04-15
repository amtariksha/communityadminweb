'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface PollOption {
  id: string;
  label: string;
  votes: number;
  percentage: number;
}

export interface Poll {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  type: string;
  options: PollOption[];
  voting_start: string;
  voting_end: string;
  who_can_vote: string;
  one_vote_per: string;
  status: string;
  total_votes: number;
  created_by: string | null;
  created_at: string;
  closed_at: string | null;
  creator_name?: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  member_id: string;
  option_id: string;
  voted_at: string;
  member_name?: string;
}

export interface PollResult {
  poll: Poll;
  options: PollOption[];
  total_votes: number;
  participation_rate: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface PollFilters {
  status?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreatePollInput {
  title: string;
  description?: string | null;
  type: string;
  options: Array<{ label: string }>;
  voting_start: string;
  voting_end: string;
  who_can_vote: string;
  one_vote_per: string;
}

interface CastVoteInput {
  poll_id: string;
  option_ids: string[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const votingKeys = {
  all: ['voting'] as const,
  lists: () => [...votingKeys.all, 'list'] as const,
  list: (filters?: PollFilters) => [...votingKeys.lists(), filters] as const,
  active: () => [...votingKeys.all, 'active'] as const,
  details: () => [...votingKeys.all, 'detail'] as const,
  detail: (id: string) => [...votingKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pollFiltersToParams(
  filters?: PollFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function usePolls(status?: string) {
  const filters: PollFilters | undefined = status ? { status } : undefined;

  return useQuery({
    queryKey: votingKeys.list(filters),
    queryFn: function fetchPolls() {
      return api
        .get<{ data: Poll[]; total: number }>('/voting/polls', {
          params: pollFiltersToParams(filters),
        })
        .then(function unwrap(res) {
          return res;
        });
    },
  });
}

export function usePoll(id: string) {
  return useQuery({
    queryKey: votingKeys.detail(id),
    queryFn: function fetchPoll() {
      return api
        .get<{ data: PollResult }>(`/voting/polls/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function useActivePolls() {
  return useQuery({
    queryKey: votingKeys.active(),
    queryFn: function fetchActivePolls() {
      return api
        .get<{ data: Poll[] }>('/voting/polls', {
          params: { status: 'active' },
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createPoll(input: CreatePollInput) {
      return api.post<{ data: Poll }>('/voting/polls', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: votingKeys.all });
    },
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function castVote(input: CastVoteInput) {
      return api.post<{ data: PollVote }>(
        `/voting/polls/${input.poll_id}/vote`,
        { option_ids: input.option_ids },
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: votingKeys.all });
    },
  });
}

export function useClosePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function closePoll(id: string) {
      return api.post<{ data: Poll }>(`/voting/polls/${id}/close`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: votingKeys.all });
    },
  });
}
