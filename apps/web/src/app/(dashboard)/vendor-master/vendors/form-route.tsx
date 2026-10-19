'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { VendorFormPage } from '../../vendors/vendor-form-page';
import { PARTY_BASES, type PartyKind } from '../party-lists';
import { PartyFormPage } from '../party-form-page';

/**
 * /vendor-master/vendors/new and /:id/edit, `?list=expense|income`: the
 * vendor form saves to vendors, the income list's form to customers.
 */
export function VendorMasterForm({ id }: { id?: string }): ReactNode {
  const router = useRouter();
  const kind: PartyKind = useSearchParams().get('list') === 'income' ? 'income' : 'expense';
  const back = () => router.push(PARTY_BASES[kind]);
  return kind === 'income' ? (
    <PartyFormPage partyId={id} onClose={back} onSaved={back} />
  ) : (
    <VendorFormPage vendorId={id} onClose={back} onSaved={back} />
  );
}
