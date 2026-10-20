'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AssistantAnswer, AssistantCard, AssistantCitation, AssistantDuesCard } from '@/hooks/use-assistant';
import { isSafeAppPath } from './assistant-screens';
import { DraftProposal } from './draft-proposal';

export type PanelMessage =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; answer: AssistantAnswer }
  | { id: number; role: 'error'; text: string };

/** Links come only from the server's citations, and only in-app paths are drawn. */
function Citations({ citations }: { citations: readonly AssistantCitation[] }): ReactNode {
  const safe = citations.filter((citation) => isSafeAppPath(citation.href));
  if (safe.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1" aria-label="Screens used">
      {safe.map((citation) => (
        <li key={citation.href}>
          <Link href={citation.href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <FileText className="h-3 w-3" aria-hidden="true" />
            {citation.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DuesTable({ card }: { card: AssistantDuesCard }): ReactNode {
  return (
    <div className="mt-2 rounded-md border bg-background p-2 text-xs">
      <p className="font-medium">
        {card.unit_number} · Current Due {formatCurrency(card.current_due)}
        {card.current_advances > 0 ? ` · Advance ${formatCurrency(card.current_advances)}` : ''}
      </p>
      <table className="mt-1 w-full">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="font-medium">Date</th>
            <th className="font-medium">Document</th>
            <th className="text-right font-medium">Due</th>
            <th className="text-right font-medium">Paid</th>
            <th className="text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {card.rows.map((row, index) => (
            <tr key={`${row.date}-${row.number ?? index}`}>
              <td>{formatDate(row.date)}</td>
              <td>{[row.document, row.number].filter(Boolean).join(' ')}</td>
              <td className="text-right">{row.due ? formatCurrency(row.due) : ''}</td>
              <td className="text-right">{row.paid ? formatCurrency(row.paid) : ''}</td>
              <td className="text-right">{formatCurrency(row.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ card }: { card: AssistantCard }): ReactNode {
  if (card.type === 'unit_dues') return <DuesTable card={card} />;
  return <DraftProposal card={card} />;
}

/** One message. The reply is plain text: nothing the model writes is read as HTML. */
export function AssistantMessage({ message }: { message: PanelMessage }): ReactNode {
  if (message.role === 'user') {
    return <p className="ml-8 whitespace-pre-wrap rounded-lg bg-primary/10 px-3 py-2 text-sm">{message.text}</p>;
  }
  if (message.role === 'error') {
    return (
      <p role="alert" className="mr-8 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">
        {message.text}
      </p>
    );
  }
  const { answer } = message;
  return (
    <div className="mr-8 rounded-lg bg-muted px-3 py-2 text-sm">
      <p className="whitespace-pre-wrap">{answer.reply}</p>
      {answer.cards.map((card, index) => (
        <Card key={`${card.type}-${index}`} card={card} />
      ))}
      <Citations citations={answer.citations} />
    </div>
  );
}
