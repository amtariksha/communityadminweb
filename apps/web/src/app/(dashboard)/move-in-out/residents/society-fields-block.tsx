'use client';

import { useState, type ReactNode } from 'react';
import { SocietyFields, editableValues, fieldErrorsFrom, initialValues } from '@/components/society-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useMemberFields, useSaveMemberFields, type FieldValue, type SubjectFields } from '@/hooks/use-resident-fields';
import { ApiError, friendlyError } from '@/lib/api-error';

function FieldsForm({ memberId, data, readOnly }: { memberId: string; data: SubjectFields; readOnly: boolean }): ReactNode {
  const save = useSaveMemberFields(memberId);
  const { addToast } = useToast();
  const [values, setValues] = useState<Record<string, FieldValue>>(() => initialValues(data.fields));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSave = () =>
    save.mutate(editableValues(data.fields, values), {
      onSuccess: () => {
        setErrors({});
        addToast({ title: 'Society fields saved', variant: 'success' });
      },
      onError: (error) => {
        if (error instanceof ApiError) setErrors(fieldErrorsFrom(error.fieldErrors));
        addToast({ title: 'Could not save the society fields', description: friendlyError(error), variant: 'destructive' });
      },
    });

  return (
    <div className="space-y-3">
      <SocietyFields
        fields={data.fields}
        values={values}
        readOnly={readOnly}
        errors={errors}
        onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
      />
      {!readOnly && data.fields.some((field) => !field.read_only) && (
        <Button type="button" onClick={onSave} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save Society Fields'}
        </Button>
      )}
    </div>
  );
}

/**
 * MOVE-15 — the "Society fields" block of the resident record (MOVE-S9):
 * the fields the society switched on for this member's type, saved with
 * PUT /tenant-lifecycle/members/:id/fields. Hidden on an older API.
 */
export function SocietyFieldsBlock({ memberId, readOnly }: { memberId: string; readOnly: boolean }): ReactNode {
  const query = useMemberFields(memberId);
  if (query.isLoading) return <Skeleton className="h-24 w-full" />;
  if (query.data === null || query.isError || !query.data) return null;
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h3 className="font-semibold">Society fields</h3>
        <FieldsForm key={query.dataUpdatedAt} memberId={memberId} data={query.data} readOnly={readOnly} />
      </CardContent>
    </Card>
  );
}
