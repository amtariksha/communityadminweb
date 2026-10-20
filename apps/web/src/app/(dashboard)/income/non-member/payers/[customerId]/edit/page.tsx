'use client';

import { type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PartyFormPage } from '../../../../../vendor-master/party-form-page';
import { NON_MEMBER_BASE } from '../../../non-member-routes';

// Income Tracker › Non Member Income › Edit Payer (INC-S33, INC-46).
export default function EditPayerPage(): ReactNode {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();
  const back = () => router.push(NON_MEMBER_BASE);
  return <PartyFormPage noun="Payer" partyId={customerId} onClose={back} onSaved={back} />;
}
