'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unitKeys } from '@/hooks/use-units';

/** Sync Utility Flats (UTIL-11): every unit with an active unit meter becomes tracked. */
export function useSyncUtilityFlats() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function syncUtilityFlats() {
      return api.post<{ data: { tracked: number } }>('/utilities/flats/sync', {}).then((res) => res.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitKeys.all }),
  });
}
