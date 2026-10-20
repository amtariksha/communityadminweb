'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/api-error';
import { useAskAssistant, useAssistantStatus, type AssistantStatus, type AssistantTurn } from '@/hooks/use-assistant';
import { AssistantMessage, type PanelMessage } from './assistant-messages';
import { useAssistantScreens } from './assistant-screens';

const HISTORY_TURNS = 10;
export const GEMINI_NOTICE =
  'Your questions, and the figures needed to answer them (unit numbers and amounts), are sent to Google Gemini. Phone numbers and e-mail addresses you type are removed first; please leave out other personal details.';

function history(messages: readonly PanelMessage[]): AssistantTurn[] {
  return messages
    .flatMap((message): AssistantTurn[] => {
      if (message.role === 'user') return [{ role: 'user', content: message.text }];
      if (message.role === 'assistant' && message.answer.reply) return [{ role: 'assistant', content: message.answer.reply.slice(0, 2000) }];
      return [];
    })
    .slice(-HISTORY_TURNS);
}

/** Why the panel cannot answer yet, or null when it can. */
function closedReason(status: AssistantStatus | null | undefined, loading: boolean, failed: boolean): ReactNode {
  if (loading) return 'Loading…';
  if (failed) return 'Could not reach the Assistant. Please try again later.';
  if (status === null || status === undefined) return 'The Assistant is not available yet.';
  if (!status.enabled) {
    return status.can_change ? (
      <>
        The Assistant is off for this society. You can switch it on in{' '}
        <Link href="/settings" className="font-medium text-primary hover:underline">
          Settings › Assistant
        </Link>
        .
      </>
    ) : (
      'The Assistant is off for this society. A community admin can switch it on in Settings.'
    );
  }
  if (!status.configured) return 'The Assistant is not set up on this server yet.';
  return null;
}

function AskForm({ onAsk, busy }: { onAsk: (text: string) => void; busy: boolean }): ReactNode {
  const [text, setText] = useState('');
  function submit(event: FormEvent): void {
    event.preventDefault();
    const question = text.trim();
    if (!question || busy) return;
    onAsk(question);
    setText('');
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t p-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) submit(event);
        }}
        maxLength={1000}
        rows={2}
        placeholder="e.g. What does B-204 owe?"
        aria-label="Ask the Assistant"
        className="min-h-10 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm"
      />
      <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label="Send">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

/** The top-bar Assistant (P3): answers about this society, citing the screens it used. */
export function AssistantPanel({ onClose }: { onClose: () => void }): ReactNode {
  const status = useAssistantStatus();
  const ask = useAskAssistant();
  const screens = useAssistantScreens();
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const nextId = useRef(1);
  const closed = closedReason(status.data, status.isLoading, status.isError);

  function onAsk(text: string): void {
    const asked: PanelMessage = { id: nextId.current++, role: 'user', text };
    setMessages((current) => [...current, asked]);
    ask.mutate(
      { message: text, history: history(messages), screens },
      {
        onSuccess: (answer) => setMessages((current) => [...current, { id: nextId.current++, role: 'assistant', answer }]),
        onError: (error) => setMessages((current) => [...current, { id: nextId.current++, role: 'error', text: friendlyError(error) }]),
      },
    );
  }

  return (
    <aside role="dialog" aria-label="Assistant" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-card text-card-foreground shadow-xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-base font-semibold">Assistant</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent" aria-label="Close the Assistant">
          <X className="h-5 w-5" />
        </button>
      </div>
      {closed ? (
        <p className="p-4 text-sm text-muted-foreground">{closed}</p>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            <p className="text-xs text-muted-foreground">{GEMINI_NOTICE}</p>
            {messages.map((message) => (
              <AssistantMessage key={message.id} message={message} />
            ))}
            {ask.isPending && <p className="text-sm text-muted-foreground">Thinking…</p>}
          </div>
          <AskForm onAsk={onAsk} busy={ask.isPending} />
        </>
      )}
    </aside>
  );
}
