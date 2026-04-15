'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Camera {
  id: string;
  name: string;
  location: string;
  tag: string;
  stream_url: string;
  snapshot_url: string;
  camera_type: string;
  brand: string;
  resolution: string;
  gate_id: string;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const cameraKeys = {
  all: ['cameras'] as const,
  list: () => [...cameraKeys.all, 'list'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useCameras() {
  return useQuery({
    queryKey: cameraKeys.list(),
    queryFn: function fetchCameras() {
      return api
        .get<{ data: Camera[] }>('/cameras')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

interface CreateCameraInput {
  name: string;
  location: string;
  tag?: string;
  stream_url?: string;
  snapshot_url?: string;
  camera_type?: string;
  brand?: string;
  resolution?: string;
  gate_id?: string;
}

interface UpdateCameraInput {
  id: string;
  name?: string;
  location?: string;
  tag?: string;
  stream_url?: string;
  snapshot_url?: string;
  camera_type?: string;
  brand?: string;
  resolution?: string;
  gate_id?: string;
  is_active?: boolean;
}

export function useCreateCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createCamera(input: CreateCameraInput) {
      return api.post<{ data: Camera }>('/cameras', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: cameraKeys.all });
    },
  });
}

export function useUpdateCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateCamera(input: UpdateCameraInput) {
      const { id, ...body } = input;
      return api.patch<{ data: Camera }>(`/cameras/${id}`, body);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: cameraKeys.all });
    },
  });
}

export function useDeleteCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deleteCamera(id: string) {
      return api.delete(`/cameras/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: cameraKeys.all });
    },
  });
}
