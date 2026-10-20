'use client';

import { useParams, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { CategoryForm } from '../../../_parts/category-form';

const LIST = '/violations/setup/categories';

// Category Set Up › Edit Category (RULE-S3 as a page).
export default function Page(): ReactNode {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  return <CategoryForm mode="page" categoryId={params.id} onClose={() => router.push(LIST)} onSaved={() => router.push(LIST)} />;
}
