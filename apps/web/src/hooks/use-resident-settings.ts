'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * UNIT-20 / UNIT-21 — the invite and approval (welcome) messages and their
 * e-mail switches (GET / PATCH /tenant-settings/residents). A null message
 * means the API's default text.
 */
export interface ResidentSettings {
  invite_message: string | null;
  invite_email_enabled: boolean;
  approval_message: string | null;
  approval_email_enabled: boolean;
}

export const INVITE_MERGE_FIELDS = ['member_name', 'society_name', 'app_link'] as const;
export const APPROVAL_MERGE_FIELDS = ['member_name', 'society_name', 'approver_name', 'unit', 'app_link'] as const;

/** The API's default texts (shown when nothing is saved); links stay as text in the editor. */
export const DEFAULT_INVITE_MESSAGE =
  '<p>Dear {{member_name}},</p><p>You have been added as a resident of {{society_name}}. Install the app and sign in ' +
  'with your mobile number to see notices, pay dues and approve your visitors.</p><p>{{app_link}}</p>';
export const DEFAULT_APPROVAL_MESSAGE =
  '<p>Dear {{member_name}},</p><p>Welcome to {{society_name}}. {{approver_name}} has approved your request for unit ' +
  '{{unit}}.</p><p>Sign in to the app with your mobile number to get started: {{app_link}}</p>';

export const residentSettingsKeys = { all: ['tenant-settings', 'residents'] as const };

/** `null` while the API has no resident settings (404 on an older server). */
export function useResidentSettings() {
  return useQuery({
    queryKey: residentSettingsKeys.all,
    meta: { suppressToast: true },
    retry: false,
    queryFn: async function fetchResidentSettings(): Promise<ResidentSettings | null> {
      try {
        return (await api.get<{ data: ResidentSettings }>('/tenant-settings/residents')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useSaveResidentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveResidentSettings(changes: Partial<ResidentSettings>) {
      return api.patch<{ data: ResidentSettings }>('/tenant-settings/residents', changes);
    },
    onSuccess: function refresh(saved) {
      queryClient.setQueryData(residentSettingsKeys.all, saved.data);
    },
  });
}

/** Merge fields in `text` that are not allowed (the API refuses them too). */
export function unknownMergeFields(text: string, allowed: readonly string[]): string[] {
  const found = [...text.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)].map((match) => match[1]);
  return [...new Set(found.filter((field) => !allowed.includes(field)))];
}
