'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { useCreateEmployee, useUpdateEmployee } from '@/hooks';
import { useNextBadge } from '@/hooks/use-next-badge';
import type { Staff } from '@/hooks/use-staff';
import type { UserSearchHit } from '@/hooks/use-user-search';
import { friendlyError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';
import { dateOnly, salaryFromInput } from '../staff-fields';
import { recordDraftError, recordDraftFrom, recordPayload, type StaffRecordDraft } from './staff-record';

/** What the Add / Edit Employee form holds while it is open. */
export interface EmployeeDraft {
  name: string;
  phone: string;
  // The directory user picked for the phone, so no duplicate user is made.
  selected: UserSearchHit | null;
  type: string;
  designation: string;
  address: string;
  emergency: string;
  joinedAt: string;
  salary: string;
}

export function draftFrom(employee?: Staff | null): EmployeeDraft {
  return {
    name: employee?.name ?? '',
    phone: employee?.phone ?? '',
    selected: null,
    type: employee?.staff_type ?? 'security_guard',
    designation: employee?.designation ?? '',
    address: employee?.address ?? '',
    emergency: employee?.emergency_contact ?? '',
    joinedAt: dateOnly(employee?.join_date),
    salary: employee?.salary == null ? '' : String(Number(employee.salary)),
  };
}

/** QA #89 — a join date at most 30 days ahead (the API refuses later ones). */
function joinDateCeiling(): string {
  const day = new Date();
  day.setDate(day.getDate() + 30);
  return day.toISOString().split('T')[0];
}

type Checked<T> = { ok: true; value: T } | { ok: false; title: string; description: string };

interface CheckedFields {
  emergency: string | undefined;
  salary: number | undefined;
}

function checkCommon(draft: EmployeeDraft): Checked<CheckedFields> {
  if (!draft.name.trim()) return { ok: false, title: 'Name is required', description: 'Enter the employee’s name.' };
  const emergency = normalizePhone(draft.emergency);
  if (!emergency.ok) return { ok: false, title: 'Invalid emergency contact', description: emergency.error };
  const salary = salaryFromInput(draft.salary);
  if (!salary.ok) return { ok: false, title: 'Invalid salary', description: 'Enter a monthly amount above zero.' };
  return { ok: true, value: { emergency: emergency.value || undefined, salary: salary.value } };
}

function checkNew(draft: EmployeeDraft, ceiling: string): Checked<string> {
  const phone = normalizePhone(draft.selected?.phone ?? draft.phone);
  if (!phone.ok || !phone.value) {
    return { ok: false, title: 'Invalid phone number', description: phone.ok ? 'Phone is required.' : phone.error };
  }
  if (draft.joinedAt && draft.joinedAt > ceiling) {
    return { ok: false, title: 'Invalid join date', description: 'Join date cannot be more than 30 days in the future.' };
  }
  return { ok: true, value: phone.value };
}

/**
 * State and saving of the employee form (STAFF-10, SB-07): one set of
 * checks and payloads for the standard dialog and the classic page.
 */
/** The badge and profile part, Badge No. pre-filled with the next free number on Add (STAFF-20). */
function useRecordDraft(employee: Staff | null | undefined) {
  const [record, setRecord] = useState<StaffRecordDraft>(() => recordDraftFrom(employee));
  const nextBadge = useNextBadge(!employee).data;
  useEffect(() => {
    if (nextBadge) setRecord((current) => (current.badgeNo ? current : { ...current, badgeNo: nextBadge }));
  }, [nextBadge]);
  const setField = <K extends keyof StaffRecordDraft>(key: K, value: StaffRecordDraft[K]) =>
    setRecord((current) => ({ ...current, [key]: value }));
  return { record, setField, resetRecord: () => setRecord(recordDraftFrom(employee)) };
}

export function useEmployeeForm(employee: Staff | null | undefined) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const [draft, setDraft] = useState<EmployeeDraft>(() => draftFrom(employee));
  const { record, setField, resetRecord } = useRecordDraft(employee);
  const maxJoinDate = useMemo(joinDateCeiling, []);
  const editing = Boolean(employee);
  const set = <K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const refuse = (check: { title: string; description: string }) =>
    addToast({ title: check.title, description: check.description, variant: 'destructive' });

  function save(onDone: () => void): void {
    const common = checkCommon(draft);
    if (!common.ok) return refuse(common);
    const recordError = recordDraftError(record);
    if (recordError) return refuse({ title: recordError, description: 'Shorten the field and save again.' });
    const fields = {
      name: draft.name,
      staff_type: draft.type,
      designation: draft.designation || undefined,
      address: draft.address || undefined,
      emergency_contact: common.value.emergency,
      salary: common.value.salary,
      ...recordPayload(record, editing),
    };
    const failed = (title: string) => (error: unknown) =>
      addToast({ title, description: friendlyError(error), variant: 'destructive' });
    if (employee) {
      updateEmployee.mutate(
        { id: employee.id, data: fields },
        { onSuccess: () => { addToast({ title: 'Employee updated', variant: 'success' }); onDone(); }, onError: failed('Failed to update employee') },
      );
      return;
    }
    const phone = checkNew(draft, maxJoinDate);
    if (!phone.ok) return refuse(phone);
    createEmployee.mutate(
      { ...fields, phone: phone.value, join_date: draft.joinedAt || undefined },
      {
        onSuccess: () => {
          addToast({ title: 'Employee added', variant: 'success' });
          // The next Add (Save and New) offers the next number again.
          void queryClient.invalidateQueries({ queryKey: ['staff', 'badges', 'next'] });
          onDone();
        },
        onError: failed('Failed to add employee'),
      },
    );
  }

  return {
    draft,
    set,
    record,
    setRecord: setField,
    reset: () => {
      setDraft(draftFrom(employee));
      resetRecord();
    },
    save,
    editing,
    maxJoinDate,
    saving: createEmployee.isPending || updateEmployee.isPending,
    error: editing ? updateEmployee.error : createEmployee.error,
  };
}
