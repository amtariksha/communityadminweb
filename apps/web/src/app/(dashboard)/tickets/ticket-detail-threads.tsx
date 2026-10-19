'use client';

import { useState, type ReactNode } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import type { TicketComment } from '@/hooks';
import { IMAGE_TYPES } from '../helpdesk/new/request-fields';
import { useRequestFiles, type UploadedFiles } from '../helpdesk/new/use-request-files';
import { CommentAttachments, CommentFilePicker } from './comment-files';

type SortOrder = 'oldest' | 'newest';

interface CannedTemplate {
  id: string;
  title: string;
  body: string;
}

interface TicketDetailThreadsProps {
  comments: TicketComment[];
  /** Canned responses; offered on the resident box only. */
  templates: CannedTemplate[];
  isPosting: boolean;
  /** Resolves once the comment is saved, so the box can be cleared. */
  onPost: (message: string, isInternal: boolean, files?: UploadedFiles) => Promise<void>;
  /** Images on comments (the record page, HELP-19). */
  withFiles?: boolean;
  /** Each thread's class, e.g. to keep the internal one off a printout. */
  threadClassName?: { resident?: string; internal?: string };
}

interface ThreadProps {
  title: string;
  isInternal: boolean;
  placeholder: string;
  emptyText: string;
  comments: TicketComment[];
  templates: CannedTemplate[];
  isPosting: boolean;
  onPost: (message: string, isInternal: boolean, files?: UploadedFiles) => Promise<void>;
  withFiles: boolean;
  className?: string;
}

function authorLabel(comment: TicketComment): string {
  if (comment.is_system || !comment.author_id) {
    return 'System';
  }
  return comment.author_name ?? 'Unknown';
}

function sortComments(comments: TicketComment[], order: SortOrder): TicketComment[] {
  const sorted = [...comments].sort(
    (first, second) =>
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
  );
  return order === 'newest' ? sorted.reverse() : sorted;
}

function formatWhen(isoDate: string): string {
  const date = new Date(isoDate);
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${formatDate(isoDate)}, ${time}`;
}

function Thread({
  title,
  isInternal,
  placeholder,
  emptyText,
  comments,
  templates,
  isPosting,
  onPost,
  withFiles,
  className,
}: ThreadProps): ReactNode {
  const [order, setOrder] = useState<SortOrder>('oldest');
  const [draft, setDraft] = useState('');
  const files = useRequestFiles(IMAGE_TYPES);
  const headingId = `thread-${isInternal ? 'internal' : 'resident'}`;
  const message = draft.trim();

  async function handlePost(): Promise<void> {
    if (!message) return;
    const uploaded = withFiles ? await files.uploadAll() : undefined;
    // A file that did not upload stays on the list, marked, and holds the comment.
    if (uploaded === null) return;
    try {
      if (uploaded && uploaded.urls.length > 0) await onPost(message, isInternal, uploaded);
      else await onPost(message, isInternal);
      setDraft('');
      files.reset();
    } catch {
      // The caller has already told the user; keep the text so nothing is lost.
    }
  }

  return (
    <section aria-labelledby={headingId} className={`space-y-3 rounded-md border p-3 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-semibold">
          {title}
        </h3>
        <select
          aria-label={`Sort ${title}`}
          className="h-7 rounded border bg-background px-2 text-xs"
          value={order}
          onChange={(event) => setOrder(event.target.value as SortOrder)}
        >
          <option value="oldest">Oldest to Recent</option>
          <option value="newest">Recent to Oldest</option>
        </select>
      </div>

      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {comments.length === 0 && (
          <li className="text-xs text-muted-foreground">{emptyText}</li>
        )}
        {sortComments(comments, order).map((comment) => (
          <li
            key={comment.id}
            data-testid="thread-comment"
            className="rounded bg-muted/50 px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{authorLabel(comment)}</span>
              <span>{formatWhen(comment.created_at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{comment.message}</p>
            <CommentAttachments comment={comment} />
          </li>
        ))}
      </ul>

      {!isInternal && templates.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Template:</span>
          <select
            aria-label="Canned response"
            className="h-7 rounded border bg-background px-2 text-xs"
            defaultValue=""
            onChange={(event) => {
              const body = event.target.value;
              if (body) setDraft((previous) => (previous ? `${previous}\n\n${body}` : body));
              event.target.value = '';
            }}
          >
            <option value="" disabled>
              Choose canned response...
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.body}>
                {template.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {withFiles && <CommentFilePicker id={`${headingId}-files`} files={files} />}

      <div className="flex gap-2">
        <Textarea
          aria-label={`Write to ${title}`}
          placeholder={placeholder}
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="flex-1"
        />
        <Button
          size="sm"
          className="self-end"
          disabled={isPosting || !message}
          onClick={handlePost}
        >
          <Send className="mr-1 h-4 w-4" /> Comment
        </Button>
      </div>
    </section>
  );
}

/**
 * The two conversations on a request, side by side. What is written in the
 * resident box reaches the resident; the internal box is for staff only
 * (the API enforces that, this component only separates them).
 */
export function TicketDetailThreads({
  comments,
  templates,
  isPosting,
  onPost,
  withFiles = false,
  threadClassName,
}: TicketDetailThreadsProps): ReactNode {
  const publicComments = comments.filter((comment) => !comment.is_internal);
  const internalComments = comments.filter((comment) => comment.is_internal);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Thread
        title="Resident Communication"
        isInternal={false}
        placeholder="Reply to the resident..."
        emptyText="No messages yet."
        comments={publicComments}
        templates={templates}
        isPosting={isPosting}
        onPost={onPost}
        withFiles={withFiles}
        className={threadClassName?.resident}
      />
      <Thread
        title="Admin Internal Communication"
        isInternal
        placeholder="Write an internal note..."
        emptyText="No notes yet."
        comments={internalComments}
        templates={[]}
        isPosting={isPosting}
        onPost={onPost}
        withFiles={withFiles}
        className={threadClassName?.internal}
      />
    </div>
  );
}
