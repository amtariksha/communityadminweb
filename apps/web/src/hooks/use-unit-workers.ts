'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Household staff categories POST /workers/register accepts. */
export const WORKER_CATEGORIES = [
  'maid', 'cook', 'driver', 'nanny', 'tutor', 'gardener', 'plumber',
  'electrician', 'carpenter', 'painter', 'therapist', 'laundry', 'security', 'other',
] as const;

export interface RegisterUnitWorkerInput {
  unit_id: string;
  name: string;
  phone: string;
  category: (typeof WORKER_CATEGORIES)[number];
}

/** UNIT-17 — + Create New Staff on the unit panel: a household worker linked to the unit. */
export function useRegisterUnitWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function registerWorker(input: RegisterUnitWorkerInput) {
      return api.post('/workers/register', input);
    },
    onSuccess: function refresh(_data, variables) {
      queryClient.invalidateQueries({ queryKey: ['units', 'panel', variables.unit_id] });
    },
  });
}
