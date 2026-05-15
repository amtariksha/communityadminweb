/**
 * 2026-05-09 (QA #284) — Hierarchical Chart of Accounts export.
 *
 * The flat CSV/TSV produced by the generic `ExportButton` loses the
 * parent → child structure that the on-screen tree shows. The audit
 * committee / Tally ops asked for a download that mirrors the UI:
 * group headers with indented children, account rows beneath each
 * leaf group.
 *
 * Implementation choice: emit a styled HTML table with a `.xls`
 * extension. Both MS Excel and LibreOffice Calc open this transparently
 * (mimetype `application/vnd.ms-excel`); they render the bold group
 * headers, the colour-coded type pills, and the indentation as a real
 * spreadsheet. The alternative (installing the `xlsx` npm package)
 * would add ~600 KB to the client bundle just for this one export,
 * which is wasteful given how cheap the HTML-table approach is.
 *
 * The output is NOT a true OOXML zip — it's an HTML file Excel
 * silently parses. Saving from Excel will convert it to real XLSX.
 * For machine-readable downstream parsers, a flat CSV is still
 * available via the existing ExportButton next to this one.
 */

import type { AccountGroup, LedgerAccount } from '@communityos/shared';

export interface CoaTreeNode {
  group: AccountGroup;
  children: CoaTreeNode[];
  accounts: LedgerAccount[];
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAmount(value: unknown): string {
  if (value == null) return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  // Excel parses this back to a real number — keep two decimals,
  // no currency symbol so the cell stays numeric.
  return n.toFixed(2);
}

// ---------------------------------------------------------------------------
// Type colour pills — Tally convention: A/L/I/E with subtle backgrounds.
// ---------------------------------------------------------------------------

function typePillStyle(type: string | undefined): string {
  switch (type) {
    case 'asset':
      return 'background:#dbeafe;color:#1e40af;';
    case 'liability':
      return 'background:#fef3c7;color:#92400e;';
    case 'income':
      return 'background:#dcfce7;color:#166534;';
    case 'expense':
      return 'background:#fee2e2;color:#991b1b;';
    default:
      return 'background:#f3f4f6;color:#374151;';
  }
}

// ---------------------------------------------------------------------------
// Tree → rows. Depth-first so children appear directly below their parent
// group. Indentation is applied via left-padding on the first cell.
// ---------------------------------------------------------------------------

interface RenderedRow {
  /** 'group' = bold group header. 'account' = leaf account row. */
  kind: 'group' | 'account';
  depth: number;
  code: string;
  name: string;
  type: string;
  openingBalance: string;
  balanceType: string;
  currentBalance: string;
  parentGroupCode: string;
  parentGroupName: string;
}

function flattenTree(
  nodes: CoaTreeNode[],
  depth: number,
  parentGroupCode: string,
  parentGroupName: string,
): RenderedRow[] {
  const rows: RenderedRow[] = [];
  for (const node of nodes) {
    rows.push({
      kind: 'group',
      depth,
      code: node.group.code,
      name: node.group.name,
      type: node.group.type,
      openingBalance: '',
      balanceType: '',
      currentBalance: '',
      parentGroupCode,
      parentGroupName,
    });
    // Account rows at depth+1 — visually one indent below the group.
    for (const account of node.accounts) {
      rows.push({
        kind: 'account',
        depth: depth + 1,
        code: account.code,
        name: account.name,
        type: node.group.type,
        openingBalance: formatAmount(account.opening_balance),
        balanceType: account.balance_type,
        currentBalance: formatAmount(account.current_balance),
        parentGroupCode: node.group.code,
        parentGroupName: node.group.name,
      });
    }
    // Recurse into child groups.
    if (node.children.length > 0) {
      rows.push(
        ...flattenTree(node.children, depth + 1, node.group.code, node.group.name),
      );
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// HTML emitter. Wraps the whole thing in a styled <table> so Excel
// preserves bold/indent/colour when opening the .xls.
// ---------------------------------------------------------------------------

function emitHtml(rows: RenderedRow[], societyLabel: string | undefined): string {
  const indentPerLevel = 20; // pixels per depth level — matches the UI tree
  const headerCells: Array<{ label: string; align?: 'right' | 'left' }> = [
    { label: 'Code' },
    { label: 'Account / Group' },
    { label: 'Type' },
    { label: 'Parent Group' },
    { label: 'Opening Balance', align: 'right' },
    { label: 'Balance Type' },
    { label: 'Current Balance', align: 'right' },
  ];

  const headerHtml = headerCells
    .map(
      (c) =>
        `<th style="background:#1f2937;color:white;padding:6px 10px;text-align:${c.align ?? 'left'};">${escapeHtml(c.label)}</th>`,
    )
    .join('');

  const rowHtml = rows
    .map((row) => {
      const padding = indentPerLevel * row.depth;
      if (row.kind === 'group') {
        return [
          '<tr>',
          `<td style="padding:6px 10px;padding-left:${padding + 10}px;font-weight:700;background:#f3f4f6;">${escapeHtml(row.code)}</td>`,
          `<td style="padding:6px 10px;font-weight:700;background:#f3f4f6;">${escapeHtml(row.name)}</td>`,
          `<td style="padding:6px 10px;background:#f3f4f6;"><span style="${typePillStyle(row.type)};padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600;text-transform:uppercase;">${escapeHtml(row.type)}</span></td>`,
          `<td style="padding:6px 10px;background:#f3f4f6;color:#6b7280;">${escapeHtml(row.parentGroupName)}</td>`,
          `<td style="padding:6px 10px;background:#f3f4f6;"></td>`,
          `<td style="padding:6px 10px;background:#f3f4f6;"></td>`,
          `<td style="padding:6px 10px;background:#f3f4f6;"></td>`,
          '</tr>',
        ].join('');
      }
      // account row
      return [
        '<tr>',
        `<td style="padding:6px 10px;padding-left:${padding + 10}px;font-family:Consolas,monospace;color:#6b7280;">${escapeHtml(row.code)}</td>`,
        `<td style="padding:6px 10px;">${escapeHtml(row.name)}</td>`,
        `<td style="padding:6px 10px;color:#6b7280;">${escapeHtml(row.type)}</td>`,
        `<td style="padding:6px 10px;color:#6b7280;">${escapeHtml(row.parentGroupName)}</td>`,
        `<td style="padding:6px 10px;text-align:right;">${escapeHtml(row.openingBalance)}</td>`,
        `<td style="padding:6px 10px;text-transform:uppercase;font-size:11px;">${escapeHtml(row.balanceType)}</td>`,
        `<td style="padding:6px 10px;text-align:right;font-weight:600;">${escapeHtml(row.currentBalance)}</td>`,
        '</tr>',
      ].join('');
    })
    .join('\n');

  const titleHtml = societyLabel
    ? `<h2 style="margin:0 0 4px 0;font-family:Arial,sans-serif;">Chart of Accounts</h2>
       <p style="margin:0 0 12px 0;color:#6b7280;font-family:Arial,sans-serif;font-size:12px;">${escapeHtml(societyLabel)}</p>`
    : '';

  return [
    '<html>',
    '<head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;}</style></head>',
    '<body>',
    titleHtml,
    '<table border="1">',
    `<thead><tr>${headerHtml}</tr></thead>`,
    '<tbody>',
    rowHtml,
    '</tbody>',
    '</table>',
    '</body>',
    '</html>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Public entry point. Triggers a browser download.
// ---------------------------------------------------------------------------

export function downloadHierarchicalCoa(
  tree: CoaTreeNode[],
  options: { filename?: string; societyLabel?: string } = {},
): void {
  const rows = flattenTree(tree, 0, '', '');
  const html = emitHtml(rows, options.societyLabel);
  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  // .xls so Excel auto-opens. Re-saving from Excel produces a real XLSX.
  anchor.download = (options.filename ?? 'chart-of-accounts') + '.xls';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
