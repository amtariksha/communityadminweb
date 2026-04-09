'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Resolution {
  id: string;
  title: string;
  body: string;
  resolution_type: 'ordinary' | 'special';
  resolution_number: string;
  status: 'draft' | 'proposed' | 'voting' | 'passed' | 'rejected' | 'withdrawn';
  quorum_required: number;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  meeting_date: string;
  meeting_type: string;
  minutes: string;
  poll_id: string | null;
  created_at: string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  positions: Array<{ name: string; seats: number }>;
  nomination_start: string;
  nomination_end: string;
  voting_start: string;
  voting_end: string;
  status: string;
  created_at: string;
}

export interface ElectionCandidate {
  id: string;
  election_id: string;
  user_id: string;
  position: string;
  manifesto: string;
  status: string;
  user_name: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateResolutionInput {
  title: string;
  body: string;
  resolution_type: 'ordinary' | 'special';
  quorum_required: number;
  meeting_date: string;
  meeting_type: string;
}

interface CreateElectionInput {
  title: string;
  description: string;
  positions: Array<{ name: string; seats: number }>;
  nomination_start: string;
  nomination_end: string;
  voting_start: string;
  voting_end: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const governanceKeys = {
  all: ['governance'] as const,
  resolutions: () => [...governanceKeys.all, 'resolutions'] as const,
  resolutionList: (status?: string) => [...governanceKeys.resolutions(), 'list', status] as const,
  resolutionDetail: (id: string) => [...governanceKeys.resolutions(), 'detail', id] as const,
  elections: () => [...governanceKeys.all, 'elections'] as const,
  electionList: (status?: string) => [...governanceKeys.elections(), 'list', status] as const,
  electionDetail: (id: string) => [...governanceKeys.elections(), 'detail', id] as const,
  electionResults: (id: string) => [...governanceKeys.elections(), 'results', id] as const,
};

// ---------------------------------------------------------------------------
// Queries -- Resolutions
// ---------------------------------------------------------------------------

export function useResolutions(status?: string) {
  return useQuery({
    queryKey: governanceKeys.resolutionList(status),
    queryFn: function fetchResolutions() {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      return api
        .get<{ data: Resolution[]; total: number }>('/governance/resolutions', { params })
        .then(function unwrap(res) {
          return res;
        });
    },
  });
}

export function useResolution(id: string) {
  return useQuery({
    queryKey: governanceKeys.resolutionDetail(id),
    queryFn: function fetchResolution() {
      return api
        .get<{ data: Resolution }>(`/governance/resolutions/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Queries -- Elections
// ---------------------------------------------------------------------------

export function useElections(status?: string) {
  return useQuery({
    queryKey: governanceKeys.electionList(status),
    queryFn: function fetchElections() {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      return api
        .get<{ data: Election[]; total: number }>('/governance/elections', { params })
        .then(function unwrap(res) {
          return res;
        });
    },
  });
}

export function useElection(id: string) {
  return useQuery({
    queryKey: governanceKeys.electionDetail(id),
    queryFn: function fetchElection() {
      return api
        .get<{ data: Election }>(`/governance/elections/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function useElectionResults(id: string) {
  return useQuery({
    queryKey: governanceKeys.electionResults(id),
    queryFn: function fetchElectionResults() {
      return api
        .get<{ data: unknown }>(`/governance/elections/${id}/results`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Mutations -- Resolutions
// ---------------------------------------------------------------------------

export function useCreateResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createResolution(input: CreateResolutionInput) {
      return api.post<{ data: Resolution }>('/governance/resolutions', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: governanceKeys.resolutions() });
    },
  });
}

export function useProposeResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function proposeResolution(id: string) {
      return api.post<{ data: Resolution }>(`/governance/resolutions/${id}/propose`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: governanceKeys.resolutions() });
    },
  });
}

export function useWithdrawResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function withdrawResolution(id: string) {
      return api.post<{ data: Resolution }>(`/governance/resolutions/${id}/withdraw`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: governanceKeys.resolutions() });
    },
  });
}

export function useRecordMinutes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function recordMinutes(input: { id: string; minutes: string }) {
      return api.patch<{ data: Resolution }>(`/governance/resolutions/${input.id}/minutes`, {
        minutes: input.minutes,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: governanceKeys.resolutions() });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations -- Elections
// ---------------------------------------------------------------------------

export function useCreateElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createElection(input: CreateElectionInput) {
      return api.post<{ data: Election }>('/governance/elections', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: governanceKeys.elections() });
    },
  });
}

export function useCloseElection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function closeElection(id: string) {
      return api.post<{ data: Election }>(`/governance/elections/${id}/close`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: governanceKeys.elections() });
    },
  });
}
