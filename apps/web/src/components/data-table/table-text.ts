import { todayIST } from '@/lib/date';
/**
 * Plain-text helpers of the shared data table (SB-04): serial numbers,
 * the pager line, Copy (tab-separated) and Print (a bare HTML table).
 * Pure functions, so they are tested without a browser.
 */

export interface TextColumn<Row> {
  header: string;
  text: (row: Row) => string;
}

export interface SerialOptions {
  serial?: { page: number; pageSize: number };
}

/** The S.No of a row: continuous across pages. */
export function serialNumber(page: number, pageSize: number, index: number): number {
  return (page - 1) * pageSize + index + 1;
}

const COUNT = new Intl.NumberFormat('en-IN');

/** "Showing 26 to 50 of 60 entries". */
export function showingText(page: number, pageSize: number, total: number): string {
  if (total === 0) return 'Showing 0 to 0 of 0 entries';
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return `Showing ${COUNT.format(first)} to ${COUNT.format(last)} of ${COUNT.format(total)} entries`;
}

/** "Plumbing (4)": a filter option or button with its count. */
export function withCount(label: string, count: number | undefined): string {
  return count === undefined ? label : `${label} (${COUNT.format(count)})`;
}

function headerRow<Row>(columns: readonly TextColumn<Row>[], options: SerialOptions): string[] {
  return [...(options.serial ? ['S.No'] : []), ...columns.map((column) => column.header)];
}

function cells<Row>(columns: readonly TextColumn<Row>[], row: Row, index: number, options: SerialOptions): string[] {
  const serial = options.serial ? [String(serialNumber(options.serial.page, options.serial.pageSize, index))] : [];
  return [...serial, ...columns.map((column) => column.text(row))];
}

/** The visible page as tab-separated text, ready to paste into a spreadsheet. */
export function toTsv<Row>(columns: readonly TextColumn<Row>[], rows: readonly Row[], options: SerialOptions = {}): string {
  const clean = (text: string): string => text.replace(/[\t\r\n]+/g, ' ');
  const lines = [
    headerRow(columns, options),
    ...rows.map((row, index) => cells(columns, row, index, options)),
  ];
  return lines.map((line) => line.map(clean).join('\t')).join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRINT_STYLE =
  'body{font-family:Arial,sans-serif;font-size:12px;color:#000}h1{font-size:16px}' +
  'table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}' +
  'th{font-weight:bold}';

/** A bare HTML page holding the visible page as a table, for printing. */
export function printableTable<Row>(
  title: string,
  columns: readonly TextColumn<Row>[],
  rows: readonly Row[],
  options: SerialOptions = {},
): string {
  const head = headerRow(columns, options).map((text) => `<th>${escapeHtml(text)}</th>`).join('');
  const body = rows
    .map((row, index) => `<tr>${cells(columns, row, index, options).map((text) => `<td>${escapeHtml(text)}</td>`).join('')}</tr>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLE}</style></head>` +
    `<body><h1>${escapeHtml(title)}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

/** "open-requests-2026-10-18.xlsx", dated in India. */
export function exportFileName(base: string, extension: string, now: Date = new Date()): string {
  const day = todayIST(now);
  return `${base}-${day}.${extension}`;
}
