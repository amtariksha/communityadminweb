'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { orNotAvailable } from './use-move-in-setup';
import { residentRecordKeys } from './use-resident-record';

/**
 * MOVE-14 / MOVE-15 — the society's resident fields (Setup › Custom Fields
 * For Move-in / Move-out) and their values on a resident record or a
 * move-out. Reads are `null` when the API does not have the routes yet (404).
 */
export type FieldPhase = 'in' | 'out';
export type FieldType = 'text' | 'date' | 'single' | 'multiple';
export type FieldAppliesTo = 'owner' | 'tenant' | 'both';
export type FieldValue = string | string[] | null;

export interface FieldDef {
  id: string;
  phase: FieldPhase;
  key: string;
  label: string;
  position: number;
  is_enabled: boolean;
  type: FieldType;
  choices: string[] | null;
  applies_to: FieldAppliesTo;
  binding: string | null;
  is_predefined: boolean;
  read_only: boolean;
}

/** A field as a form shows it, with its value. */
export interface FormField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  choices: string[] | null;
  read_only: boolean;
  value?: FieldValue;
}

export interface SubjectFields {
  subject_id: string;
  applies_to: 'owner' | 'tenant';
  fields: FormField[];
}

export interface SaveFieldDefsInput {
  rows: Array<{
    id: string;
    position: number;
    label: string;
    is_enabled: boolean;
    type: FieldType;
    choices: string[] | null;
    applies_to: FieldAppliesTo;
  }>;
}

export const residentFieldKeys = {
  all: ['resident-fields'] as const,
  defs: (phase: FieldPhase) => [...residentFieldKeys.all, 'defs', phase] as const,
  form: (phase: FieldPhase, applies: 'owner' | 'tenant') => [...residentFieldKeys.all, 'form', phase, applies] as const,
  member: (memberId: string) => [...residentFieldKeys.all, 'member', memberId] as const,
  exit: (exitId: string) => [...residentFieldKeys.all, 'exit', exitId] as const,
};

export function useFieldDefs(phase: FieldPhase) {
  return useQuery({
    queryKey: residentFieldKeys.defs(phase),
    queryFn: () => orNotAvailable(() => api.get<{ data: FieldDef[] }>(`/tenant-lifecycle/fields/${phase}`).then((res) => res.data)),
  });
}

export function useSaveFieldDefs(phase: FieldPhase) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveFieldDefsInput) =>
      api.put<{ data: FieldDef[] }>(`/tenant-lifecycle/fields/${phase}`, input).then((res) => res.data),
    onSuccess(defs) {
      queryClient.setQueryData(residentFieldKeys.defs(phase), defs);
      void queryClient.invalidateQueries({ queryKey: [...residentFieldKeys.all, 'form'] });
    },
  });
}

/** The enabled fields a form shows to an owner or a tenant (MOVE-15). */
export function useFormFields(phase: FieldPhase, applies: 'owner' | 'tenant' | null) {
  return useQuery({
    queryKey: residentFieldKeys.form(phase, applies ?? 'owner'),
    enabled: applies !== null,
    queryFn: () =>
      orNotAvailable(() =>
        api.get<{ data: FieldDef[] }>(`/tenant-lifecycle/fields/${phase}/form`, { params: { applies_to: applies ?? 'owner' } }).then((res) => res.data),
      ),
  });
}

export function useMemberFields(memberId: string) {
  return useQuery({
    queryKey: residentFieldKeys.member(memberId),
    queryFn: () => orNotAvailable(() => api.get<{ data: SubjectFields }>(`/tenant-lifecycle/members/${memberId}/fields`).then((res) => res.data)),
  });
}

export function useSaveMemberFields(memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, FieldValue>) =>
      api.put<{ data: SubjectFields }>(`/tenant-lifecycle/members/${memberId}/fields`, { values }).then((res) => res.data),
    onSuccess(fields) {
      queryClient.setQueryData(residentFieldKeys.member(memberId), fields);
      // Bound fields (date of birth, lives here, agreement dates) are on the record too.
      void queryClient.invalidateQueries({ queryKey: residentRecordKeys.record(memberId) });
    },
  });
}

/** MOVE-15 — the fields typed on Add Member, saved once the member exists. */
export function useSaveFieldsOfNewMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId: string; values: Record<string, FieldValue> }) =>
      api.put<{ data: SubjectFields }>(`/tenant-lifecycle/members/${input.memberId}/fields`, { values: input.values }).then((res) => res.data),
    onSuccess(fields) {
      queryClient.setQueryData(residentFieldKeys.member(fields.subject_id), fields);
    },
  });
}

/** What a move-in request sent for the society's fields (its View). */
export function useOnboardingFields(onboardingId: string | null) {
  return useQuery({
    queryKey: [...residentFieldKeys.all, 'onboarding', onboardingId ?? ''] as const,
    enabled: Boolean(onboardingId),
    queryFn: () =>
      orNotAvailable(() => api.get<{ data: SubjectFields }>(`/tenant-lifecycle/onboardings/${onboardingId}/fields`).then((res) => res.data)),
  });
}

export function useExitFields(exitId: string | null) {
  return useQuery({
    queryKey: residentFieldKeys.exit(exitId ?? ''),
    enabled: Boolean(exitId),
    queryFn: () => orNotAvailable(() => api.get<{ data: SubjectFields }>(`/tenant-lifecycle/exits/${exitId}/fields`).then((res) => res.data)),
  });
}
