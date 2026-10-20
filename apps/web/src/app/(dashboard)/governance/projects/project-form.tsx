'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { ShowLogsButton } from '@/components/show-logs';
import { useToast } from '@/components/ui/toast';
import { useCreateProject, useNextProjectNumber, useUpdateProject, type ProjectDetail } from '@/hooks/use-projects';
import { friendlyError } from '@/lib/api-error';
import { projectFormError, projectFormValues, projectPayload, type ProjectFormValues } from './project-fields';
import { ProjectFormFields } from './project-form-fields';
import { EMPTY_NOTE, noteError, ProjectNoteEditor } from './project-note-editor';

export interface ProjectFormProps {
  /** Edit this project; absent to create one. */
  project?: ProjectDetail | null;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: (project: ProjectDetail) => void;
}

/**
 * Create Project / Edit Project (PROJ-S5) as a page: heading "Project-<n>"
 * (the next number before saving), the fields, and on create the first
 * note and the Watching tick. On edit the notes thread sits under it.
 */
export function ProjectForm(props: ProjectFormProps): ReactNode {
  const { addToast } = useToast();
  const create = useCreateProject();
  const update = useUpdateProject();
  const [values, setValues] = useState<ProjectFormValues>(() => projectFormValues(props.project));
  const [note, setNote] = useState(EMPTY_NOTE);
  const [watch, setWatch] = useState(true);
  const next = useNextProjectNumber(!props.project);
  const set = (patch: Partial<ProjectFormValues>) => setValues((current) => ({ ...current, ...patch }));
  const number = props.project?.project_no ?? next.data?.project_no;

  async function save(): Promise<void> {
    if (props.readOnly) return props.onClose();
    const problem = projectFormError(values) ?? (props.project ? null : noteError(note));
    if (problem) return addToast({ title: 'Check the project', description: problem, variant: 'destructive' });
    try {
      const saved = props.project
        ? await update.mutateAsync({ id: props.project.id, data: projectPayload(values) })
        : await create.mutateAsync({ ...projectPayload(values), watch, ...(note.body.trim() ? { note: { ...note, body: note.body.trim() } } : {}) });
      addToast({ title: props.project ? 'Project saved' : `Project-${saved.project_no} created`, variant: 'success' });
      props.onSaved(saved);
    } catch (error) {
      addToast({ title: 'Could not save the project', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <FormFrame
      mode="page"
      title={number ? `Project-${number}` : props.project ? 'Edit Project' : 'Create Project'}
      description={props.project ? 'Edit the project; notes and files go in the thread below.' : 'A society project the committee tracks.'}
      onClose={props.onClose}
      onSave={() => void save()}
      saving={create.isPending || update.isPending}
      saveDisabled={props.readOnly}
    >
      <div className="space-y-4">
        {props.project && (
          <div className="flex justify-end">
            <ShowLogsButton recordTypes={['project']} recordId={props.project.id} />
          </div>
        )}
        <ProjectFormFields values={values} set={set} drivenByName={props.project?.driven_by_name} />
        {!props.project && (
          <>
            <ProjectNoteEditor value={note} onChange={setNote} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={watch} onChange={(e) => setWatch(e.target.checked)} />
              Watching
            </label>
          </>
        )}
      </div>
    </FormFrame>
  );
}
