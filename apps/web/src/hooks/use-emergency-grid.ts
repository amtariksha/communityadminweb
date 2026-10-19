'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { lifestyleKeys, type EmergencyContact } from './use-lifestyle';

/** One row of PUT /directory/emergency-contacts/bulk (PROF-10). */
export interface EmergencyContactRow {
  id?: string;
  name: string;
  phone: string;
  category: EmergencyContact['category'];
  available_24_7: boolean;
  remove?: true;
}

/** Saves the whole Setup Emergency Numbers grid in one request. */
export function useSaveEmergencyContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: EmergencyContactRow[]) =>
      api.put<{ data: EmergencyContact[] }>('/directory/emergency-contacts/bulk', { rows }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lifestyleKeys.emergencyContacts.all }),
  });
}
