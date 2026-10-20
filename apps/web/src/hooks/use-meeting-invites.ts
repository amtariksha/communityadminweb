'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { meetingKeys } from './use-meetings';

/**
 * PROJ-42 / PROJ-43 / PROJ-44 / PROJ-48 — a meeting's invitees, invitations,
 * attendance, attachments and linked resolutions, and the society's
 * switches for invitations and reminders.
 */

export interface InvitablePerson {
  user_id: string;
  name: string | null;
  designation: string | null;
}

export interface InvitablePeople {
  committee: InvitablePerson[];
  office_staff: InvitablePerson[];
}

export interface MeetingInvitee {
  user_id: string;
  name: string | null;
  source: 'named' | 'audience';
  invited_at: string | null;
  attended: boolean;
}

export interface MeetingAttachment {
  id: string;
  file_url: string;
  file_name: string;
  size_bytes: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface LinkedResolution {
  id: string;
  resolution_number: string | null;
  title: string;
  resolution_type: string;
  meeting_type: string | null;
  status: string;
}

export interface MeetingNoticeSettings {
  invitations_enabled: boolean;
  reminders_enabled: boolean;
}

/**
 * An API older than these routes reads `/meetings/invitable` and
 * `/meetings/settings` as a meeting id (400) — or does not have them (404).
 */
export function isMeetingRouteMissing(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return status === 404 || status === 400;
}

const inviteKeys = {
  invitable: [...meetingKeys.all, 'invitable'] as const,
  settings: [...meetingKeys.all, 'settings'] as const,
};

/** The form's Committee Members and Office Staff pick-lists. */
export function useInvitablePeople() {
  return useQuery({
    queryKey: inviteKeys.invitable,
    queryFn: async () => (await api.get<{ data: InvitablePeople }>('/meetings/invitable')).data,
    retry: false,
    staleTime: 60_000,
    meta: { suppressToast: true },
  });
}

export function useMeetingNoticeSettings() {
  return useQuery({
    queryKey: inviteKeys.settings,
    queryFn: async () => (await api.get<{ data: MeetingNoticeSettings }>('/meetings/settings')).data,
    retry: false,
    meta: { suppressToast: true },
  });
}

export function useSaveMeetingNoticeSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: MeetingNoticeSettings) => (await api.put<{ data: MeetingNoticeSettings }>('/meetings/settings', settings)).data,
    onSuccess: (saved) => queryClient.setQueryData(inviteKeys.settings, saved),
  });
}

function useMeetingWrite<Input, Output>(request: (input: Input) => Promise<Output>, meetingIdOf: (input: Input) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.detail(meetingIdOf(input)) });
      void queryClient.invalidateQueries({ queryKey: meetingKeys.lists() });
    },
  });
}

/** Send Invitations: only people not invited yet are told. */
export function useSendInvitations() {
  return useMeetingWrite(
    async (meetingId: string) => (await api.post<{ data: { invited: number } }>(`/meetings/${meetingId}/invite`)).data,
    (meetingId) => meetingId,
  );
}

export function usePutInvitees() {
  return useMeetingWrite(
    async ({ meetingId, userIds }: { meetingId: string; userIds: string[] }) =>
      (await api.put<{ data: MeetingInvitee[] }>(`/meetings/${meetingId}/invitees`, { user_ids: userIds })).data,
    (input) => input.meetingId,
  );
}

export function useMarkAttendance() {
  return useMeetingWrite(
    async ({ meetingId, rows }: { meetingId: string; rows: Array<{ user_id: string; attended: boolean }> }) =>
      (await api.patch<{ data: MeetingInvitee[] }>(`/meetings/${meetingId}/attendance`, { rows })).data,
    (input) => input.meetingId,
  );
}

export function useAddMeetingAttachment() {
  return useMeetingWrite(
    async ({ meetingId, file }: { meetingId: string; file: { url: string; name: string; size_bytes?: number } }) =>
      (await api.post<{ data: MeetingAttachment[] }>(`/meetings/${meetingId}/attachments`, file)).data,
    (input) => input.meetingId,
  );
}

export function useRemoveMeetingAttachment() {
  return useMeetingWrite(
    async ({ meetingId, attachmentId }: { meetingId: string; attachmentId: string }) =>
      (await api.delete<{ data: MeetingAttachment[] }>(`/meetings/${meetingId}/attachments/${attachmentId}`)).data,
    (input) => input.meetingId,
  );
}

/** PROJ-48 — link (or unlink) one resolution while the meeting is open. */
export function useLinkResolution() {
  return useMeetingWrite(
    async ({ meetingId, resolutionId, link }: { meetingId: string; resolutionId: string; link: boolean }) => {
      const path = `/meetings/${meetingId}/resolutions/${resolutionId}`;
      return (link ? await api.put<{ data: LinkedResolution[] }>(path) : await api.delete<{ data: LinkedResolution[] }>(path)).data;
    },
    (input) => input.meetingId,
  );
}
