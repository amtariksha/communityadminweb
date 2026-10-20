'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useAddProjectNote, useWatchProject, type ProjectDetail } from '@/hooks/use-projects';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { StoredFileLinks } from '../stored-files';
import { EMPTY_NOTE, noteError, ProjectNoteEditor } from './project-note-editor';

/**
 * Under the Edit Project form (PROJ-S5): the notes thread (system notes of
 * status changes included), Add a Note with files, and the viewer's
 * Watching toggle. Watchers are told of each new note and status change.
 */
export function ProjectNotes({ project, canWrite }: { project: ProjectDetail; canWrite: boolean }): ReactNode {
  const { addToast } = useToast();
  const add = useAddProjectNote();
  const watch = useWatchProject();
  const [note, setNote] = useState(EMPTY_NOTE);

  async function send(): Promise<void> {
    const problem = noteError(note);
    if (problem || !note.body.trim()) return addToast({ title: problem ?? 'Write the note first.', variant: 'destructive' });
    try {
      await add.mutateAsync({ id: project.id, note: { body: note.body.trim(), attachments: note.attachments } });
      setNote(EMPTY_NOTE);
      addToast({ title: 'Note added', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not add the note', description: friendlyError(error), variant: 'destructive' });
    }
  }

  const toggleWatch = (): void =>
    watch.mutate(
      { id: project.id, watch: !project.watching },
      { onError: (error) => addToast({ title: 'Could not change watching', description: friendlyError(error), variant: 'destructive' }) },
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Notes</CardTitle>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={project.watching} disabled={watch.isPending} onChange={toggleWatch} />
          Watching
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        {project.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ol className="space-y-3">
            {project.notes.map((item) => (
              <li key={item.id} className="space-y-1 border-b pb-2 text-sm last:border-0">
                <p className={item.is_system ? 'italic text-muted-foreground' : 'whitespace-pre-wrap'}>{item.body}</p>
                <StoredFileLinks files={item.attachments} />
                <p className="text-xs text-muted-foreground">
                  {item.created_by_name ?? '—'} · {formatDate(item.created_at)}
                </p>
              </li>
            ))}
          </ol>
        )}
        {canWrite && (
          <div className="space-y-2">
            <ProjectNoteEditor value={note} onChange={setNote} disabled={add.isPending} />
            <Button type="button" size="sm" disabled={add.isPending} onClick={() => void send()}>
              Add Note
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
