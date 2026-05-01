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

// ---------------------------------------------------------------------------
// QA #13-1c / #13-1d — owner direct-onboard policy toggle
// ---------------------------------------------------------------------------
//
// Per-society flag controlling whether unit owners can onboard
// their own tenants without going through the committee-approval
// workflow. Persisted at
// `tenants.settings_json.owners_can_direct_onboard`.
//
//   GET   /tenant-settings/owner-direct-onboard
//         → readable by any authed tenant member (resident app
//           uses it to decide whether to show the "Onboard
//           Tenant" button).
//   PATCH /tenant-settings/owner-direct-onboard
//         → writable by `community_admin` or `super_admin`.
//
// NOTE: As of writing the backend endpoints (D1 #13-1c / #13-1d)
// have not yet shipped. The admin web toggle will fail-soft
// (loading skeleton; PATCH errors out via the standard
// friendlyError toast) until they deploy. The contract here
// matches the shape locked in qa-round13.md §C1 line by line.

export interface OwnerDirectOnboardSetting {
  enabled: boolean;
}

export const ownerDirectOnboardKeys = {
  all: ['tenant-settings', 'owner-direct-onboard'] as const,
};

export function useOwnerDirectOnboardSetting() {
  return useQuery({
    queryKey: ownerDirectOnboardKeys.all,
    queryFn: async () => {
      const res = await api.get<{ data: OwnerDirectOnboardSetting }>(
        '/tenant-settings/owner-direct-onboard',
      );
      return res.data;
    },
    // Default off if the backend hasn't shipped yet — the toggle
    // card has its own loading state, but downstream consumers
    // (e.g. the admin Onboard Tenant info chip mentioned in the
    // plan) can rely on `data.enabled === true` without
    // null-checking.
  });
}

export function useUpdateOwnerDirectOnboardSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OwnerDirectOnboardSetting) => {
      const res = await api.patch<{ data: OwnerDirectOnboardSetting }>(
        '/tenant-settings/owner-direct-onboard',
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerDirectOnboardKeys.all });
    },
  });
}
