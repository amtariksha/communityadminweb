'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types (mirror apps/api safety module)
// ---------------------------------------------------------------------------

export type SosStatus =
  | 'active'
  | 'acknowledged'
  | 'resolved'
  | 'false_alarm'
  | 'cancelled';
export type SosCategory = 'panic' | 'medical' | 'fire' | 'security' | 'other';

export interface SosAlert {
  id: string;
  status: SosStatus;
  category: SosCategory;
  triggerer_role: string;
  triggered_by: string | null;
  triggered_by_name: string | null;
  unit_id: string | null;
  unit_number: string | null;
  gate_id: string | null;
  latitude: string | null;
  longitude: string | null;
  location_text: string | null;
  note: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SosEvent {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  actor_name: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export type BroadcastCategory =
  | 'fire'
  | 'gas'
  | 'evacuation'
  | 'security'
  | 'weather'
  | 'general';

export interface EmergencyBroadcast {
  id: string;
  category: BroadcastCategory;
  title: string;
  message: string;
  audience: 'all' | 'owners' | 'tenants' | 'staff';
  recipient_count: number;
  is_active: boolean;
  stood_down_at: string | null;
  created_at: string;
}

interface Paginated<T> {
  data: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const sosKeys = {
  all: ['sos'] as const,
  list: (status?: string) => [...sosKeys.all, 'list', status ?? 'all'] as const,
  detail: (id: string) => [...sosKeys.all, 'detail', id] as const,
  broadcasts: ['emergency-broadcasts'] as const,
};

// ---------------------------------------------------------------------------
// SOS queries
// ---------------------------------------------------------------------------

export function useSosAlerts(status?: string) {
  return useQuery({
    queryKey: sosKeys.list(status),
    queryFn: function fetchSos() {
      const params: Record<string, string> = { limit: '100' };
      if (status) params.status = status;
      return api.get<Paginated<SosAlert>>('/safety/sos', { params });
    },
    // Safety-critical — keep the desk console fresh without sockets.
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
}

export function useSosDetail(id: string) {
  return useQuery({
    queryKey: sosKeys.detail(id),
    queryFn: function fetchSosDetail() {
      return api
        .get<{ data: { alert: SosAlert; events: SosEvent[] } }>(
          `/safety/sos/${id}`,
        )
        .then((res) => res.data);
    },
    enabled: id !== '',
    refetchInterval: 5000,
  });
}

// ---------------------------------------------------------------------------
// SOS mutations
// ---------------------------------------------------------------------------

function useSosAction(action: 'ack' | 'cancel') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: SosAlert }>(`/safety/sos/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: sosKeys.all }),
  });
}

export function useAcknowledgeSos() {
  return useSosAction('ack');
}

export function useCancelSos() {
  return useSosAction('cancel');
}

export function useResolveSos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      status: 'resolved' | 'false_alarm';
      resolution_note?: string;
    }) =>
      api.post<{ data: SosAlert }>(`/safety/sos/${input.id}/resolve`, {
        status: input.status,
        resolution_note: input.resolution_note,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sosKeys.all }),
  });
}

// ---------------------------------------------------------------------------
// Emergency broadcast (mass siren)
// ---------------------------------------------------------------------------

export function useBroadcasts() {
  return useQuery({
    queryKey: sosKeys.broadcasts,
    queryFn: () =>
      api.get<Paginated<EmergencyBroadcast>>('/safety/broadcasts', {
        params: { limit: '20' },
      }),
    refetchInterval: 15000,
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      category: BroadcastCategory;
      title: string;
      message: string;
      audience?: 'all' | 'owners' | 'tenants' | 'staff';
    }) => api.post<{ data: EmergencyBroadcast }>('/safety/broadcasts', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sosKeys.broadcasts }),
  });
}

export function useStandDownBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: EmergencyBroadcast }>(
        `/safety/broadcasts/${id}/stand-down`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: sosKeys.broadcasts }),
  });
}
