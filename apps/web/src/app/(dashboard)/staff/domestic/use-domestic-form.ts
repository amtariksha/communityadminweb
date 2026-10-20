'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { useNextBadge } from '@/hooks/use-next-badge';
import { useStaffCategories } from '@/hooks/use-staff-categories';
import { useCreateDomesticStaff, useUpdateDomesticStaff, type DomesticStaff, type DomesticStaffInput } from '@/hooks/use-staff-register';
import { ApiError, friendlyError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';
import { recordDraftError, recordDraftFrom, recordPayload, dayOf, type StaffRecordDraft } from '../employee-form/staff-record';
import type { PickedUnit } from './units-picker';

/** What the household-help form holds while it is open (STAFF-42, screen STAFF-S3 Domestic). */
export interface DomesticDraft {
  name: string;
  phone: string;
  categoryId: string;
  units: PickedUnit[];
  joinedAt: string;
  address: string;
}

export function domesticDraftFrom(saved?: DomesticStaff | null): DomesticDraft {
  return {
    name: saved?.name ?? '',
    phone: saved?.phone ?? '',
    categoryId: saved?.category_id ?? '',
    units: saved?.units ?? [],
    joinedAt: dayOf(saved?.join_date),
    address: saved?.address ?? '',
  };
}

type Problem = { title: string; description: string };

/** The first thing to fix before saving, or null. */
export function domesticDraftError(draft: DomesticDraft, editing: boolean): Problem | null {
  if (draft.name.trim().length < 2) return { title: 'Name is required', description: 'Enter the helper’s name.' };
  if (!editing) {
    const phone = normalizePhone(draft.phone);
    if (!phone.ok || !phone.value) return { title: 'Invalid phone number', description: phone.ok ? 'Phone is required.' : phone.error };
  }
  if (!draft.categoryId) return { title: 'Pick a category', description: 'Choose the household-help category.' };
  if (draft.units.length === 0) return { title: 'Pick a unit', description: 'Pick at least one unit the helper works in.' };
  return null;
}

/** What Add (POST /workers/admin) and Edit (PATCH /workers/:id) send. */
export function domesticPayload(draft: DomesticDraft, record: StaffRecordDraft, editing: boolean): DomesticStaffInput {
  const phone = normalizePhone(draft.phone);
  return {
    name: draft.name.trim(),
    ...(editing ? {} : { phone: phone.ok ? phone.value : draft.phone }),
    category_id: draft.categoryId,
    unit_ids: draft.units.map((unit) => unit.id),
    join_date: draft.joinedAt || null,
    address: draft.address.trim() || null,
    ...recordPayload(record, editing),
  };
}

function saveError(error: unknown): string {
  // The admin web ships before the API: an older server has no Staff Manager path for helpers.
  if (error instanceof ApiError && error.status === 404) return 'Adding household help here is not available yet.';
  return friendlyError(error);
}

export function useDomesticForm(saved: DomesticStaff | null | undefined) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const create = useCreateDomesticStaff();
  const update = useUpdateDomesticStaff();
  const editing = Boolean(saved);
  const [draft, setDraft] = useState<DomesticDraft>(() => domesticDraftFrom(saved));
  const [record, setRecord] = useState<StaffRecordDraft>(() => recordDraftFrom(saved));
  const nextBadge = useNextBadge(!saved).data;
  useEffect(() => {
    if (nextBadge) setRecord((current) => (current.badgeNo ? current : { ...current, badgeNo: nextBadge }));
  }, [nextBadge]);
  const categories = useStaffCategories({ kind: 'domestic' });
  const set = <K extends keyof DomesticDraft>(key: K, value: DomesticDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setRecordField = <K extends keyof StaffRecordDraft>(key: K, value: StaffRecordDraft[K]) =>
    setRecord((current) => ({ ...current, [key]: value }));

  function save(onDone: () => void): void {
    const problem = domesticDraftError(draft, editing) ?? (recordDraftError(record) ? { title: recordDraftError(record)!, description: 'Shorten the field and save again.' } : null);
    if (problem) {
      addToast({ title: problem.title, description: problem.description, variant: 'destructive' });
      return;
    }
    const payload = domesticPayload(draft, record, editing);
    const failed = (error: unknown) => addToast({ title: 'Could not save', description: saveError(error), variant: 'destructive' });
    const done = (title: string) => () => {
      addToast({ title, variant: 'success' });
      void queryClient.invalidateQueries({ queryKey: ['staff', 'badges', 'next'] });
      onDone();
    };
    if (saved) update.mutate({ id: saved.id, data: payload }, { onSuccess: done('Household help updated'), onError: failed });
    else create.mutate(payload, { onSuccess: done('Household help added'), onError: failed });
  }

  return {
    draft,
    set,
    record,
    setRecord: setRecordField,
    categories: categories.data ?? null,
    categoriesLoading: categories.isLoading,
    editing,
    save,
    reset: () => {
      setDraft(domesticDraftFrom(saved));
      setRecord(recordDraftFrom(saved));
    },
    saving: create.isPending || update.isPending,
    error: editing ? update.error : create.error,
  };
}
