'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { type ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PROJECT_STATUS_LABELS, type ProjectRow, type ProjectStatus } from '@/hooks/use-projects';
import { PROJECTS_BASE } from '@/lib/project-states';

export interface ProjectCardProps {
  project: ProjectRow;
  onWatch: (project: ProjectRow, watch: boolean) => void;
  /** Absent for a reader who may not change projects (the accountant). */
  onStatus?: (project: ProjectRow, status: ProjectStatus) => void;
}

/** "3 Notes / Watching : Yes" — the card footer (PROJ-S4). */
export function cardFooter(project: Pick<ProjectRow, 'notes_count' | 'watching'>): string {
  const notes = `${project.notes_count} ${project.notes_count === 1 ? 'Note' : 'Notes'}`;
  return `${notes} / Watching : ${project.watching ? 'Yes' : 'No'}`;
}

/**
 * One project on a status board (PROJ-S4): "Project-<n> - <Category>", the
 * description, who drives it, the notes / watching footer, Details, and an
 * overflow with Watch / Unwatch and Change status.
 */
export function ProjectCard({ project, onWatch, onStatus }: ProjectCardProps): ReactNode {
  const others = (Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).filter((status) => status !== project.status);
  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Project-{project.project_no} - {project.category}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`More for Project-${project.project_no}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onWatch(project, !project.watching)}>{project.watching ? 'Unwatch' : 'Watch'}</DropdownMenuItem>
              {onStatus &&
                others.map((status) => (
                  <DropdownMenuItem key={status} onClick={() => onStatus(project, status)}>
                    Move to {PROJECT_STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="line-clamp-2 text-sm">{project.topic}</p>
        <p className="text-xs text-muted-foreground">Driven by {project.driven_by_name ?? 'Unassigned'}</p>
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <span className="text-xs text-muted-foreground">{cardFooter(project)}</span>
          <Link href={`${PROJECTS_BASE}/${project.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })} data-slot="button" data-size="sm">
            Details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
