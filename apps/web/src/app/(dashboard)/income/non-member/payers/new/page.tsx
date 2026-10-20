'use client';

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PartyFormPage } from '../../../../vendor-master/party-form-page';
import { NON_MEMBER_BASE } from '../../non-member-routes';

// Income Tracker › Non Member Income › Add Payer (INC-S33, INC-46): the party form as a page.
export default function NewPayerPage(): ReactNode {
  const router = useRouter();
  const back = () => router.push(NON_MEMBER_BASE);
  return <PartyFormPage noun="Payer" onClose={back} onSaved={back} />;
}
