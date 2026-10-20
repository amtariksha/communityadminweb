'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { CategoryForm } from '../../../_parts/category-form';

const LIST = '/violations/setup/categories';

// Category Set Up › Create Category (RULE-S3 as a page).
export default function Page(): ReactNode {
  const router = useRouter();
  return (
    <CategoryForm
      mode="page"
      onClose={() => router.push(LIST)}
      onSaved={(saved) => router.replace(`${LIST}/${saved.id}`)}
    />
  );
}
