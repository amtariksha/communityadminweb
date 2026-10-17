'use client';

import { useState, type ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCreateHelpdeskTemplate, useHelpdeskTemplates } from '@/hooks';
import { friendlyError } from '@/lib/api-error';

interface CannedTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The society's canned replies: list and add (moved out of tickets-content). */
export function CannedTemplatesDialog({ open, onOpenChange }: CannedTemplatesDialogProps): ReactNode {
  const { addToast } = useToast();
  const { data: templates = [] } = useHelpdeskTemplates();
  const createTemplate = useCreateHelpdeskTemplate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function save(): Promise<void> {
    try {
      await createTemplate.mutateAsync({ title, body });
      addToast({ title: 'Template created', variant: 'success' });
      setTitle('');
      setBody('');
    } catch (err) {
      addToast({ title: 'Failed to create template', description: friendlyError(err), variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Canned Response Templates
          </DialogTitle>
          <DialogDescription>
            Pre-defined response templates to accelerate resolution and standardise resident communications.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add New Template</h4>
            <Input
              placeholder="Template Title (e.g. Electrician Dispatched)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea placeholder="Template message body..." rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <Button size="sm" disabled={createTemplate.isPending || !title.trim() || !body.trim()} onClick={() => void save()}>
              {createTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Available Templates ({templates.length})
            </h4>
            {templates.length === 0 ? (
              <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                No canned templates defined yet. Add one above!
              </p>
            ) : (
              <div className="max-h-[260px] space-y-2 overflow-y-auto">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-lg border p-3 hover:bg-muted/20">
                    <div className="text-sm font-medium">{template.title}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
