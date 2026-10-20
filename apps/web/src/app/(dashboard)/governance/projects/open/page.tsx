import type { ReactNode } from 'react';
import { ProjectBoard } from '../project-board';

// Projects › one status board (PROJ-S4, PROJ-41); the status comes from the route.
export default function Page(): ReactNode {
  return <ProjectBoard />;
}
