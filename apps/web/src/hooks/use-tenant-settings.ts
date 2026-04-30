'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// QA #350 — per-society Help & Support contact endpoints.
//
// Backend lives under `/tenant-settings/help-contact` (separate
// from `/tenants/:id/settings` because residents need to read
// the help info without knowing the tenant id). The TenantId
// interceptor derives tenant from the JWT.
//
//   GET   /tenant-settings/help-contact — any authed tenant member
//   PATCH /tenant-settings/help-contact — super_admin /
//                                         community_admin /
//                                         committee_member only
//
// Persisted at `tenants.settings_json.help_contact`. Backend
// schema mirrored here:

export interface HelpContactCustomLink {
  label: string;
  url: string;
}

export interface HelpContact {
  phone?: string;
  email?: string;
  whatsapp?: string;
  hours?: string;
  escalation_phone?: string;
  custom_links?: HelpContactCustomLink[];
}

export const helpContactKeys = {
  all: ['tenant-settings', 'help-contact'] as const,
};

export function useHelpContact() {
  return useQuery({
    queryKey: helpContactKeys.all,
    queryFn: async () => {
      const res = await api.get<{ data: HelpContact | null }>(
        '/tenant-settings/help-contact',
      );
      return res.data;
    },
  });
}

export function useUpdateHelpContact() {
  const qc = useQueryClient();
  return useMutation({
    // Pass `null` to clear the help_contact block entirely.
    mutationFn: (input: HelpContact | null) =>
      api.patch<{ data: HelpContact | null }>(
        '/tenant-settings/help-contact',
        input,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: helpContactKeys.all });
    },
  });
}
