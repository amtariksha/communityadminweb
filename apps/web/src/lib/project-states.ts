import type { StatusRoute } from '@/components/layout/menu/status-menu';
import type { ProjectStatus } from '@/hooks/use-projects';

/** Projects › Open · In Progress · Closed (SB-05, PROJ-S4): each a board under /governance/projects. */
export interface ProjectStateRoute extends StatusRoute {
  status: ProjectStatus;
  emptyText: string;
}

export const PROJECTS_BASE = '/governance/projects';

export const PROJECT_STATES: readonly ProjectStateRoute[] = [
  { slug: 'open', label: 'Open', status: 'open', emptyText: 'No Open projects.' },
  { slug: 'in-progress', label: 'In Progress', status: 'in_progress', emptyText: 'No In-Progress projects.' },
  { slug: 'closed', label: 'Closed', status: 'closed', emptyText: 'No Closed projects.' },
];

// projects/project.schemas.ts PROJECT_WRITE_ROLES; the accountant reads.
export const PROJECT_WRITE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'committee_member']);
