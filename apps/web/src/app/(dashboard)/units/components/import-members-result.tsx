import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ApiError } from '@/lib/api-error';
import type { MemberImportResult } from '@/hooks/use-units';

const FIELD_LABELS: Record<string, string> = {
  unit_number: 'Unit',
  unit_id: 'Unit',
  name: 'Name',
  phone: 'Phone',
  member_type: 'Resident type',
  email: 'Email',
  intercom: 'Intercom',
  move_in_date: 'Move-in date',
};

const ROW_ERROR_KEY = /^members\.(\d+)(?:\.(\w+))?$/;

/**
 * When the server refuses the whole file it names each bad row in its error
 * keys (`members.3.phone`). Turns those into lines a person can act on, with
 * rows counted from 1 as in the result list.
 */
export function rowErrorsFromApiError(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  const lines: string[] = [];
  for (const [key, message] of Object.entries(error.fieldErrors)) {
    const match = ROW_ERROR_KEY.exec(key);
    if (!match) continue;
    const row = Number(match[1]) + 1;
    const field = match[2] ? `${FIELD_LABELS[match[2]] ?? match[2]}: ` : '';
    lines.push(`Row ${row}: ${field}${message}`);
  }
  return lines;
}

interface ImportMembersResultProps {
  result?: MemberImportResult | null;
  /** Rows the server refused when it rejected the whole file. */
  rowErrors?: string[];
}

function rowLines(result: MemberImportResult): string[] {
  if (!result.results) return result.errors;
  return result.results.flatMap((entry) => {
    const text = entry.status === 'skipped' ? entry.error : entry.note;
    return text ? [`Row ${entry.row}: ${text}`] : [];
  });
}

export function ImportMembersResult({ result, rowErrors = [] }: ImportMembersResultProps): ReactNode {
  if (!result && rowErrors.length === 0) return null;
  const lines = result ? rowLines(result) : rowErrors;
  return (
    <div className="space-y-2 rounded-md border p-3">
      {result ? (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">Imported: {result.imported}</span>
          <span className="text-sm text-muted-foreground">Skipped: {result.skipped}</span>
        </div>
      ) : (
        <p className="text-sm font-medium text-destructive">
          Nothing was imported. Fix these rows and try again.
        </p>
      )}
      {lines.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            Rows needing attention ({lines.length}):
          </div>
          <ul className="max-h-32 overflow-y-auto text-xs text-destructive">
            {lines.map((line) => (
              <li key={line} className="py-0.5">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
