'use client';

import { useParams, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject } from '@/hooks/use-projects';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isRouteMissing } from '@/lib/not-deployed';
import { PROJECT_WRITE_ROLES, PROJECTS_BASE } from '@/lib/project-states';
import { ProjectForm } from '../project-form';
import { ProjectNotes } from '../project-notes';

// Projects › Edit Project with its notes thread (PROJ-S5, PROJ-41).
export default function Page(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const query = useProject(id);
  const canWrite = PROJECT_WRITE_ROLES.has(currentRole() ?? '');
  if (isRouteMissing(query.error)) {
    return <p className="text-sm text-muted-foreground">Projects are not available yet.</p>;
  }
  if (query.error) return <p className="text-sm text-destructive">Could not load the project: {friendlyError(query.error)}</p>;
  if (!query.data) return <Skeleton className="h-48 w-full" />;
  return (
    <div className="space-y-4">
      <ProjectForm key={query.data.id} project={query.data} readOnly={!canWrite} onClose={() => router.push(PROJECTS_BASE)} onSaved={() => undefined} />
      <ProjectNotes project={query.data} canWrite={canWrite} />
    </div>
  );
}
