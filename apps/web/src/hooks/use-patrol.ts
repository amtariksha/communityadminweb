'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types (mirror apps/api gate-ops patrol module — Phase 8 #47)
// ---------------------------------------------------------------------------

export interface PatrolRoute {
  id: string;
  name: string;
  description: string | null;
  expected_minutes: number | null;
  is_active: boolean;
  created_at: string;
}

export interface PatrolCheckpoint {
  id: string;
  route_id: string;
  gate_id: string | null;
  name: string;
  qr_code: string;
  sequence: number;
  location_note: string | null;
  created_at: string;
}

interface Envelope<T> {
  data: T;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function usePatrolRoutes() {
  return useQuery({
    queryKey: ['patrol', 'routes'],
    queryFn: () => api.get<Envelope<PatrolRoute[]>>('/gate/patrol/routes'),
    select: (r) => r.data,
  });
}

export function usePatrolCheckpoints(routeId: string | null) {
  return useQuery({
    queryKey: ['patrol', 'checkpoints', routeId],
    enabled: !!routeId,
    queryFn: () =>
      api.get<Envelope<PatrolCheckpoint[]>>(
        `/gate/patrol/routes/${routeId}/checkpoints`,
      ),
    select: (r) => r.data,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface CreateRouteInput {
  name: string;
  description?: string;
  expected_minutes?: number;
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRouteInput) =>
      api.post<Envelope<PatrolRoute>>('/gate/patrol/routes', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patrol', 'routes'] }),
  });
}

export interface AddCheckpointInput {
  routeId: string;
  name: string;
  sequence?: number;
  location_note?: string;
}

export function useAddCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, ...body }: AddCheckpointInput) =>
      api.post<Envelope<PatrolCheckpoint>>(
        `/gate/patrol/routes/${routeId}/checkpoints`,
        body,
      ),
    onSuccess: (_res, vars) =>
      qc.invalidateQueries({
        queryKey: ['patrol', 'checkpoints', vars.routeId],
      }),
  });
}
