import type { ReportColumn, ReportResult, ReportSection } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/utils';

/** How report cells read on screen, in Copy and in Print (REP-S2). */

const COUNT = new Intl.NumberFormat('en-IN');

export function cellDisplay(column: Pick<ReportColumn, 'type'>, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  switch (column.type) {
    case 'money':
      return formatCurrency(value as number | string);
    case 'date':
      return formatDate(String(value));
    case 'percent':
      return `${value}%`;
    case 'number': {
      const amount = Number(value);
      return Number.isFinite(amount) ? COUNT.format(amount) : String(value);
    }
    default:
      return String(value);
  }
}

/** The totals row of a section as cells: its label under the first column without a total. */
export function totalsCells(section: ReportSection): string[] | null {
  if (!section.totals) return null;
  const { label, values } = section.totals;
  const labelIndex = Math.max(
    0,
    section.columns.findIndex((column) => !(column.key in values)),
  );
  return section.columns.map((column, index) => {
    if (column.key in values) return cellDisplay(column, values[column.key]);
    return index === labelIndex ? label : '';
  });
}

function sectionLines(section: ReportSection): string[][] {
  const header = ['S.No', ...section.columns.map((column) => column.label)];
  const rows = section.rows.map((row, index) => [
    String(index + 1),
    ...section.columns.map((column) => cellDisplay(column, row[column.key])),
  ]);
  const totals = totalsCells(section);
  return [
    ...(section.heading ? [[section.heading]] : []),
    header,
    ...rows,
    ...(totals ? [['', ...totals]] : []),
  ];
}

/** The shown result as tab-separated text, ready to paste into a spreadsheet. */
export function reportCopyText(result: ReportResult): string {
  const clean = (text: string): string => text.replace(/[\t\r\n]+/g, ' ');
  return result.sections
    .map((section) => sectionLines(section).map((line) => line.map(clean).join('\t')).join('\n'))
    .join('\n\n');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PRINT_STYLE =
  'body{font-family:Arial,sans-serif;font-size:12px;color:#000}h1{font-size:16px}h2{font-size:13px;margin-top:16px}' +
  'table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}';

function sectionHtml(section: ReportSection): string {
  const [first, ...rest] = sectionLines(section);
  const lines = section.heading ? rest : [first, ...rest];
  const [header, ...body] = lines;
  const head = header.map((text) => `<th>${escapeHtml(text)}</th>`).join('');
  const rows = body.map((line) => `<tr>${line.map((text) => `<td>${escapeHtml(text)}</td>`).join('')}</tr>`).join('');
  const heading = section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : '';
  return `${heading}<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** A bare HTML page of the shown result, for printing. */
export function reportPrintHtml(result: ReportResult): string {
  const subtitle = result.subtitle ? `<p>${escapeHtml(result.subtitle)}</p>` : '';
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(result.title)}</title>` +
    `<style>${PRINT_STYLE}</style></head><body><h1>${escapeHtml(result.title)}</h1>${subtitle}` +
    `${result.sections.map(sectionHtml).join('')}</body></html>`
  );
}
