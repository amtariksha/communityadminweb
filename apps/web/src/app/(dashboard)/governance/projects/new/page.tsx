'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { PROJECTS_BASE } from '@/lib/project-states';
import { ProjectForm } from '../project-form';

// Projects › Create Project (PROJ-S5, PROJ-41).
export default function Page(): ReactNode {
  const router = useRouter();
  return <ProjectForm onClose={() => router.push(PROJECTS_BASE)} onSaved={(project) => router.push(`${PROJECTS_BASE}/${project.id}`)} />;
}
