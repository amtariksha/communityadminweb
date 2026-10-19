'use client';

import { useParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { EditRequestForm } from '../../edit-request-form';

// Units & Users › Unapproved Users › Edit (UNIT-13, SB-07 page).
export default function Page(): ReactNode {
  const { onboardingId } = useParams<{ onboardingId: string }>();
  return <EditRequestForm onboardingId={onboardingId} />;
}
