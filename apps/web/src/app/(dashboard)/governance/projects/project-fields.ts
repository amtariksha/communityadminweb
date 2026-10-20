import type { ProjectDetail, ProjectInput, ProjectPriority, ProjectStatus } from '@/hooks/use-projects';

/**
 * The project form's values, rules and request body (PROJ-S5). Pure, so
 * the create and edit pages share them and the API's rules (PROJ-40).
 */
export interface ProjectFormValues {
  category: string;
  topic: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  driven_by: string;
  start_date: string;
  target_date: string;
}

export function projectFormValues(project?: ProjectDetail | null): ProjectFormValues {
  return {
    category: project?.category ?? '',
    topic: project?.topic ?? '',
    status: project?.status ?? 'open',
    priority: project?.priority ?? 'medium',
    driven_by: project?.driven_by ?? '',
    start_date: project?.start_date ?? '',
    target_date: project?.target_date ?? '',
  };
}

/** Null when valid. */
export function projectFormError(values: ProjectFormValues): string | null {
  const category = values.category.trim();
  if (category.length < 2 || category.length > 60) return 'Category is 2 to 60 characters.';
  const topic = values.topic.trim();
  if (topic.length < 2 || topic.length > 255) return 'Topic is 2 to 255 characters.';
  if (values.start_date && values.target_date && values.target_date < values.start_date) {
    return 'The target date is on or after the start date.';
  }
  return null;
}

export function projectPayload(values: ProjectFormValues): ProjectInput {
  return {
    category: values.category.trim(),
    topic: values.topic.trim(),
    status: values.status,
    priority: values.priority,
    driven_by: values.driven_by || null,
    start_date: values.start_date || null,
    target_date: values.target_date || null,
  };
}
