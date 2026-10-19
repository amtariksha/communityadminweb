import type { ApproverGrid } from '@/hooks/use-approver-grid';
import type { CreatePRInput, PRDetail, PRLineInput } from '@/hooks/use-purchase-requests';
import { HSN_SAC_MESSAGE, HSN_SAC_PATTERN, lineAmounts, type GstType, type LineAmounts } from '@/lib/gst-lines';

/**
 * EXP-08 — the purchase request form's values, checks and payload. The
 * page shows its own sums; the server recomputes and stores its own.
 */
export interface LineValues {
  key: number;
  ledger_account_id: string;
  description: string;
  hsn_sac: string;
  quantity: string;
  unit_rate: string;
  gst_type: GstType;
  gst_rate: string;
}

export interface LevelChoice {
  level: number;
  /** The grid's people at this level (the author left out). */
  options: Array<{ user_id: string; name: string }>;
  selected: string[];
  min: string;
}

export interface RequestValues {
  title: string;
  vendor_id: string;
  request_date: string;
  details: string;
  lines: LineValues[];
  levels: LevelChoice[];
}

export type RequestErrors = Partial<Record<'title' | 'vendor_id' | 'request_date' | 'details' | 'lines' | 'levels', string>> & {
  line?: Record<number, string>;
};

let lineKey = 1;

export function emptyLine(gstType: GstType): LineValues {
  return {
    key: lineKey++,
    ledger_account_id: '',
    description: '',
    hsn_sac: '',
    quantity: '1',
    unit_rate: '',
    gst_type: gstType,
    gst_rate: gstType === 'none' ? '0' : '18',
  };
}

export function amountsOf(line: LineValues): LineAmounts {
  return lineAmounts(Number(line.quantity), Number(line.unit_rate), line.gst_type, Number(line.gst_rate));
}

/** Level blocks from the SB-11 grid: everyone at the level but the author, all chosen, the grid's minimum. */
export function levelChoices(grid: ApproverGrid | null | undefined, me: string | null): LevelChoice[] {
  if (!grid?.configured) return [];
  return grid.levels
    .filter((level) => level.approver_count > 0)
    .map((level) => {
      const options = grid.people
        .filter((person) => person.level === level.level && person.user_id !== me)
        .map((person) => ({ user_id: person.user_id, name: person.name ?? 'Unnamed user' }));
      return {
        level: level.level,
        options,
        selected: options.map((option) => option.user_id),
        min: String(Math.max(1, Math.min(level.min_approvals, options.length))),
      };
    });
}

function lineError(line: LineValues, rates: readonly number[]): string | null {
  if (!line.ledger_account_id) return 'Pick an expense head';
  const quantity = Number(line.quantity);
  if (!(quantity > 0) || quantity > 1_000_000 || !/^\d+(\.\d{1,3})?$/.test(line.quantity.trim())) {
    return 'Quantity is more than 0, up to 3 decimals';
  }
  if (!/^\d+(\.\d{1,2})?$/.test(line.unit_rate.trim())) return 'Rate is 0 or more, up to 2 decimals';
  if (line.hsn_sac.trim() && !HSN_SAC_PATTERN.test(line.hsn_sac.trim())) return HSN_SAC_MESSAGE;
  if (line.gst_type !== 'none' && !rates.includes(Number(line.gst_rate))) return 'Pick a GST rate';
  if (line.description.length > 500) return 'Description is at most 500 characters';
  return null;
}

export function levelError(level: LevelChoice): string | null {
  if (level.selected.length === 0) return `Level ${level.level} has no approvers — set them in Setup › Purchase Request`;
  const min = Number(level.min);
  if (!Number.isInteger(min) || min < 1 || min > 10) return 'Min approvals is a whole number from 1 to 10';
  if (min > level.selected.length) return 'Min approvals cannot exceed approvers';
  return null;
}

/** Checks for Save as draft (`sending` false) or Send for approval. */
export function validateRequest(values: RequestValues, rates: readonly number[], sending: boolean): RequestErrors {
  const errors: RequestErrors = {};
  const title = values.title.trim();
  if (title.length < 3 || title.length > 255) errors.title = 'Title is 3 to 255 characters';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.request_date)) errors.request_date = 'Pick the request date';
  if (values.details.length > 20_000) errors.details = 'Request details are at most 20,000 characters';
  if (sending && !values.vendor_id) errors.vendor_id = 'Pick a vendor before sending for approval';
  if (values.lines.length === 0) errors.lines = 'Add at least one expense head';
  const line: Record<number, string> = {};
  values.lines.forEach((entry) => {
    const problem = lineError(entry, rates);
    if (problem) line[entry.key] = problem;
  });
  if (Object.keys(line).length > 0) errors.line = line;
  if (sending) {
    const problem = values.levels.map(levelError).find(Boolean);
    if (problem) errors.levels = problem;
  }
  return errors;
}

export function hasErrors(errors: RequestErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Request details typed as plain paragraphs, sent as the allowed HTML (p / br). */
export function detailsToHtml(text: string): string | null {
  const escaped = text.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!escaped) return null;
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function htmlToText(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br>/g, '\n')
    .replace(/<\/p>\s*<p>/g, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function lineInput(line: LineValues): PRLineInput {
  return {
    ledger_account_id: line.ledger_account_id,
    description: line.description.trim() || null,
    hsn_sac: line.hsn_sac.trim() || null,
    quantity: Number(line.quantity),
    unit_rate: Number(line.unit_rate),
    gst_type: line.gst_type,
    gst_rate: line.gst_type === 'none' ? 0 : Number(line.gst_rate),
  };
}

export function requestPayload(values: RequestValues, submit: boolean): CreatePRInput {
  return {
    title: values.title.trim(),
    vendor_id: values.vendor_id || null,
    request_date: values.request_date,
    details_html: detailsToHtml(values.details),
    lines: values.lines.map(lineInput),
    ...(submit && values.levels.length > 0
      ? {
          approval: {
            levels: values.levels.map((level) => ({
              level: level.level,
              approver_user_ids: level.selected,
              min_approvals: Number(level.min),
            })),
          },
        }
      : {}),
    submit,
  };
}

/** The form's values for a stored request (edit a draft, or view). */
export function valuesFromDetail(detail: PRDetail): Omit<RequestValues, 'levels'> {
  const pr = detail.purchase_request;
  return {
    title: pr.title,
    vendor_id: pr.vendor_id ?? '',
    request_date: pr.request_date,
    details: htmlToText(pr.details_html) || (detail.legacy ? (pr.description ?? '') : ''),
    lines: detail.lines.map((line) => ({
      key: lineKey++,
      ledger_account_id: line.ledger_account_id ?? '',
      description: line.description ?? '',
      hsn_sac: line.hsn_sac ?? '',
      quantity: String(Number(line.quantity)),
      unit_rate: String(Number(line.unit_rate)),
      gst_type: line.gst_type,
      gst_rate: String(Number(line.gst_rate)),
    })),
  };
}
