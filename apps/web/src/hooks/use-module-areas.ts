'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** PROJ-47 — Projects & Meetings › SetUp › Access Control: areas of a module per person. */

export interface AreaCell {
  enabled: boolean;
  /** Whether the person's roles reach the area at all. */
  available: boolean;
}

export interface AreaPersonRow {
  user_id: string;
  name: string | null;
  roles: string[];
  locked: boolean;
  areas: Record<string, AreaCell>;
}

export interface AreaMatrix {
  module: string;
  areas: Array<{ id: string; label: string }>;
  people: AreaPersonRow[];
}

const areaKeys = {
  matrix: (module: string) => ['module-areas', 'matrix', module] as const,
  mine: ['module-areas', 'mine'] as const,
};

export function useAreaMatrix(module: string) {
  return useQuery({
    queryKey: areaKeys.matrix(module),
    queryFn: async () => (await api.get<{ data: AreaMatrix }>(`/rbac/module-areas/${module}`)).data,
    retry: false,
    meta: { suppressToast: true },
  });
}

export function useSaveAreaMatrix(module: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<{ user_id: string; areas: Record<string, boolean> }>) =>
      (await api.put<{ data: AreaMatrix }>(`/rbac/module-areas/${module}`, { rows })).data,
    onSuccess: (saved) => {
      queryClient.setQueryData(areaKeys.matrix(module), saved);
      void queryClient.invalidateQueries({ queryKey: areaKeys.mine });
    },
  });
}

/** The signed-in person's areas per module; null on an API without them (everything shows). */
export function useMyModuleAreas() {
  return useQuery({
    queryKey: areaKeys.mine,
    retry: false,
    staleTime: 60_000,
    meta: { suppressToast: true },
    queryFn: async () => {
      try {
        return (await api.get<{ data: Record<string, Record<string, boolean>> }>('/rbac/me/module-areas')).data;
      } catch {
        return null;
      }
    },
  });
}
