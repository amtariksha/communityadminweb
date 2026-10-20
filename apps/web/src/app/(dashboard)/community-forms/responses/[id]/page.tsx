'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { ResponseDetail } from './response-detail';

// Community Forms › Responses › one response (FORM-S5).
export default function Page(): ReactNode {
  const params = useParams<{ id: string }>();
  return <ResponseDetail id={params.id} />;
}
