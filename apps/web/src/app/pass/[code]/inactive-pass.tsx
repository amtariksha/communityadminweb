import type { ReactNode } from 'react';

export type PassStamp = 'REVOKED' | 'EXPIRED' | 'USED';

export interface PassStatusFields {
  status?: string;
  valid_until?: string;
  entries_used?: number;
  max_entries?: number;
}

/**
 * The stamp over a pass that can no longer be used. The API sends `status`
 * (and, for such a pass, nothing else); older APIs sent only the dates and counts.
 */
export function passStampOf(data: PassStatusFields, now: Date = new Date()): PassStamp | null {
  if (data.status === 'revoked') return 'REVOKED';
  const pastEnd = data.valid_until !== undefined && new Date(data.valid_until) < now;
  if (data.status === 'expired' || pastEnd) return 'EXPIRED';
  const usedUp =
    data.entries_used !== undefined && data.max_entries !== undefined && data.entries_used >= data.max_entries;
  if (data.status === 'used' || usedUp) return 'USED';
  return null;
}

const STAMP_TEXT: Record<PassStamp, string> = {
  REVOKED: 'This pass has been cancelled by the host.',
  EXPIRED: 'This pass has expired.',
  USED: 'This pass has already been used.',
};

/** A pass that is no longer valid: the API returns its status alone, so show just that. */
export function InactivePassCard({ stamp }: { stamp: PassStamp }): ReactNode {
  const colour = stamp === 'USED' ? 'border-yellow-500 text-yellow-500' : 'border-red-500 text-red-500';
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-800 bg-gray-900 px-6 py-10 text-center shadow-2xl">
          <h1 className="text-xl font-semibold text-white">Visitor Pass</h1>
          <p className={`-rotate-12 rounded-lg border-4 px-8 py-3 text-4xl font-black tracking-wider ${colour}`}>
            {stamp}
          </p>
          <p className="text-sm text-gray-400">{STAMP_TEXT[stamp]}</p>
        </div>
        <p className="mt-6 text-center text-xs text-gray-600">Powered by Mera Ghar</p>
      </div>
    </div>
  );
}
