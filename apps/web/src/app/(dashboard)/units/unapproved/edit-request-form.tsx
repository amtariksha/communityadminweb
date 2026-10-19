'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { FormFrame, useFormMode } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useApprovalDetail } from '@/hooks';
import { useEditOnboarding, useOnboardingForEdit, type OnboardingForEdit } from '@/hooks/use-unapproved-users';
import { ApiError, friendlyError } from '@/lib/api-error';
import { checkEditRequest, type EditRequestErrors, type EditRequestValues } from './edit-request-fields';

const LIST = '/units/unapproved';

function saveError(error: unknown): string {
  if (error instanceof ApiError && error.code === 'onboarding_not_pending') {
    return 'This request has already been decided, so it can no longer be edited.';
  }
  return friendlyError(error);
}

function Field(props: { id: string; label: string; error?: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
      <FormFieldError message={props.error} />
    </div>
  );
}

function EditFields(props: {
  values: EditRequestValues;
  errors: EditRequestErrors;
  unit: string;
  onChange: (next: EditRequestValues) => void;
}): ReactNode {
  const { values, errors, onChange } = props;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="edit-name" label="Name *" error={errors.name}>
        <Input id="edit-name" value={values.name} maxLength={200} onChange={(e) => onChange({ ...values, name: e.target.value })} />
      </Field>
      <Field id="edit-phone" label="Phone/Mobile *" error={errors.phone}>
        <Input id="edit-phone" inputMode="tel" value={values.phone} onChange={(e) => onChange({ ...values, phone: e.target.value })} />
      </Field>
      <Field id="edit-email" label="Email" error={errors.email}>
        <Input id="edit-email" type="email" value={values.email} onChange={(e) => onChange({ ...values, email: e.target.value })} />
      </Field>
      <Field id="edit-type" label="Membership Status *">
        <Select
          id="edit-type"
          value={values.memberType}
          onChange={(e) => onChange({ ...values, memberType: e.target.value as EditRequestValues['memberType'] })}
        >
          <option value="tenant">Tenant</option>
          <option value="tenant_family">Tenant Family</option>
        </Select>
      </Field>
      <Field id="edit-unit" label="Unit">
        <Input id="edit-unit" value={props.unit} readOnly disabled />
        <p className="text-xs text-muted-foreground">To move the request to another unit, the resident asks again.</p>
      </Field>
    </div>
  );
}

function EditForm({ onboarding, memberType }: { onboarding: OnboardingForEdit; memberType: string }): ReactNode {
  const router = useRouter();
  const mode = useFormMode();
  const { addToast } = useToast();
  const save = useEditOnboarding();
  const [values, setValues] = useState<EditRequestValues>({
    name: onboarding.tenant_name,
    phone: onboarding.tenant_phone,
    email: onboarding.tenant_email ?? '',
    memberType: memberType === 'tenant_family' ? 'tenant_family' : 'tenant',
  });
  const [errors, setErrors] = useState<EditRequestErrors>({});

  async function submit(): Promise<void> {
    const checked = checkEditRequest(values);
    setErrors(checked.errors);
    if (!checked.changes) return;
    try {
      await save.mutateAsync({ id: onboarding.id, changes: checked.changes });
      addToast({ title: 'Request updated', variant: 'success' });
      router.push(LIST);
    } catch (error) {
      addToast({ title: 'Could not save the request', description: saveError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame mode={mode} open title="Edit Unapproved User" onClose={() => router.push(LIST)} onSave={() => void submit()} saving={save.isPending}>
      <EditFields values={values} errors={errors} unit={onboarding.unit_number} onChange={setValues} />
    </FormFrame>
  );
}

/** Unapproved Users › Edit (UNIT-S1) as a page (SB-07), for a request still waiting. */
export function EditRequestForm({ onboardingId }: { onboardingId: string }): ReactNode {
  const onboardingQuery = useOnboardingForEdit(onboardingId);
  const approvalQuery = useApprovalDetail(onboardingQuery.data?.approval_request_id ?? '');
  if (onboardingQuery.isError) return <p className="text-sm text-destructive">This request could not be loaded.</p>;
  if (!onboardingQuery.data || (onboardingQuery.data.approval_request_id && !approvalQuery.data)) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (onboardingQuery.data.status !== 'pending') {
    return <p className="text-sm text-muted-foreground">This request has already been decided, so it can no longer be edited.</p>;
  }
  const memberType = String(approvalQuery.data?.request.metadata.member_type ?? 'tenant');
  return <EditForm onboarding={onboardingQuery.data} memberType={memberType} />;
}
