'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useRouteStatus } from '@/components/layout/menu/use-route-status';
import { useProjectList, useUpdateProject, useWatchProject, type ProjectRow, type ProjectStatus } from '@/hooks/use-projects';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { PROJECT_STATES, PROJECT_WRITE_ROLES, PROJECTS_BASE } from '@/lib/project-states';
import { ProjectCard } from './project-card';

/** Projects › Open · In Progress · Closed (PROJ-S4): a card board of one status, read from the route. */
export function ProjectBoard(): ReactNode {
  const route = useRouteStatus(PROJECTS_BASE, PROJECT_STATES) ?? PROJECT_STATES[0];
  const query = useProjectList({ status: route.status });
  const watch = useWatchProject();
  const update = useUpdateProject();
  const { addToast } = useToast();
  const canWrite = PROJECT_WRITE_ROLES.has(currentRole() ?? '');
  const fail = (title: string) => (error: unknown) => addToast({ title, description: friendlyError(error), variant: 'destructive' });

  const onWatch = (project: ProjectRow, on: boolean): void =>
    watch.mutate({ id: project.id, watch: on }, { onError: fail('Could not change watching') });
  const onStatus = (project: ProjectRow, status: ProjectStatus): void =>
    update.mutate(
      { id: project.id, data: { status } },
      { onSuccess: () => addToast({ title: `Project-${project.project_no} moved`, variant: 'success' }), onError: fail('Could not move the project') },
    );

  function body(): ReactNode {
    if (query.isLoading) return <Skeleton className="h-40 w-full" />;
    if (isNotDeployed(query.error)) return <p className="text-sm text-muted-foreground">Projects are not available yet.</p>;
    if (query.error) return <p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p>;
    const projects = query.data?.data ?? [];
    if (projects.length === 0) return <p className="text-sm text-muted-foreground">{route.emptyText}</p>;
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onWatch={onWatch} onStatus={canWrite ? onStatus : undefined} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Link href={`${PROJECTS_BASE}/new`} className={buttonVariants({ size: 'sm' })} data-slot="button" data-size="sm">
            Create Project
          </Link>
        </div>
      )}
      {body()}
    </div>
  );
}
