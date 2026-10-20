'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { ShowLogsButton } from '@/components/show-logs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useCreateCustomer, useCustomer, useUpdateCustomer } from '@/hooks/use-customers';
import { friendlyError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';
import {
  createPartyPayload,
  emptyPartyForm,
  partyFormError,
  partyFormFromParty,
  updatePartyPayload,
  type Party,
  type PartyFormValues,
  type PartyPayload,
} from './party-form';
import { PartyFormFields } from './party-form-fields';

interface PartyFormPageProps {
  partyId?: string;
  onClose: () => void;
  onSaved: () => void;
  /** "Vendor" in Vendor Master (default), "Payer" in Income Tracker › Non Member Income. */
  noun?: 'Vendor' | 'Payer';
}

function withPhone(payload: PartyPayload): { payload: PartyPayload } | { error: string } {
  if (payload.phone === undefined || payload.phone === null) return { payload };
  const phone = normalizePhone(payload.phone);
  return phone.ok ? { payload: { ...payload, phone: phone.value || null } } : { error: phone.error };
}

function PartyFormBody(props: PartyFormPageProps & { party?: Party }): ReactNode {
  const noun = props.noun ?? 'Vendor';
  const { addToast } = useToast();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const initial = props.party ? partyFormFromParty(props.party) : emptyPartyForm();
  const [values, setValues] = useState<PartyFormValues>(initial);
  const set = (patch: Partial<PartyFormValues>) => setValues((current) => ({ ...current, ...patch }));

  async function save(): Promise<void> {
    const problem = partyFormError(values);
    if (problem) return addToast({ title: problem, variant: 'destructive' });
    const built = withPhone(props.party ? updatePartyPayload(initial, values) : createPartyPayload(values));
    if ('error' in built) return addToast({ title: 'Invalid phone number', description: built.error, variant: 'destructive' });
    try {
      if (props.party) {
        if (Object.keys(built.payload).length > 0) await update.mutateAsync({ id: props.party.id, data: built.payload });
      } else {
        await create.mutateAsync(built.payload as PartyPayload & { name: string });
      }
      addToast({ title: props.party ? `${noun} updated` : `${noun} added`, variant: 'success' });
      props.onSaved();
    } catch (error) {
      addToast({ title: `Could not save the ${noun.toLowerCase()}`, description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode="page"
      title={props.party ? `Edit ${noun} — ${props.party.name}` : `Add ${noun}`}
      description={
        props.party ? <ShowLogsButton recordTypes={['customer']} recordId={props.party.id} /> : 'A party the society bills for non-member income.'
      }
      onClose={props.onClose}
      onSave={() => void save()}
      saving={create.isPending || update.isPending}
    >
      <PartyFormFields values={values} set={set} showActive={Boolean(props.party)} noun={noun} />
    </FormFrame>
  );
}

/** Add / Edit a non-member-income party as a page (VEND-S2 from VEND-S3, VEND-07). */
export function PartyFormPage(props: PartyFormPageProps): ReactNode {
  const query = useCustomer(props.partyId ?? '');
  if (!props.partyId) return <PartyFormBody {...props} />;
  if (query.error) return <p className="text-sm text-destructive">Could not load the {(props.noun ?? 'Vendor').toLowerCase()}: {friendlyError(query.error)}</p>;
  if (!query.data) return <Skeleton className="h-64 w-full" />;
  return <PartyFormBody key={query.dataUpdatedAt} {...props} party={query.data as Party} />;
}
