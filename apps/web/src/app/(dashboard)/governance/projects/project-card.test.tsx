import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectRow } from '@/hooks/use-projects';
import { cardFooter, ProjectCard } from './project-card';

/** Projects › status boards (PROJ-41, screen PROJ-S4): the card's title and its notes / watching footer. */

const PROJECT = {
  id: 'p-1',
  project_no: 7,
  category: 'Water',
  topic: 'New sump pump',
  status: 'in_progress',
  priority: 'low',
  driven_by_name: 'Ravi Test',
  notes_count: 3,
  watching: false,
} as ProjectRow;

describe('ProjectCard', () => {
  it('reads "<n> Notes / Watching : Yes|No"', () => {
    expect(cardFooter({ notes_count: 3, watching: false })).toBe('3 Notes / Watching : No');
    expect(cardFooter({ notes_count: 1, watching: true })).toBe('1 Note / Watching : Yes');
  });

  it('shows Project-<n> - <Category>, who drives it, the footer and Details', () => {
    render(<ProjectCard project={PROJECT} onWatch={vi.fn()} />);

    expect(screen.getByText('Project-7 - Water')).toBeTruthy();
    expect(screen.getByText('Driven by Ravi Test')).toBeTruthy();
    expect(screen.getByText('3 Notes / Watching : No')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Details' }).getAttribute('href')).toBe('/governance/projects/p-1');
  });
});
