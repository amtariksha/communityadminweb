'use client';

import type { ReactNode } from 'react';
import { ExportButton } from '@/components/ui/export-button';
import { Button } from '@/components/ui/button';
import type { FinancialStatements, StatementSection } from '@/hooks/use-ledger-statements';
import { formatCurrency, formatDate } from '@/lib/utils';

export type StatementLayout = 'horizontal' | 'vertical';

interface Line {
  label: string;
  amount: number;
  kind: 'group' | 'account';
}

interface Side {
  heading: string;
  lines: Line[];
  total: number;
}

function sectionLines(sections: readonly StatementSection[]): Line[] {
  return sections.flatMap((section) => [
    { label: section.group_name, amount: section.total, kind: 'group' as const },
    ...section.accounts.map((account) => ({ label: account.account_name, amount: account.balance, kind: 'account' as const })),
  ]);
}

function balanceSheetSides(data: FinancialStatements): [Side, Side] {
  const sheet = data.balance_sheet;
  const surplus: Line[] = sheet.unclosed_surplus
    ? [{ label: `Income & Expenditure (not yet closed): ${sheet.unclosed_surplus >= 0 ? 'Surplus' : 'Deficit'}`, amount: sheet.unclosed_surplus, kind: 'group' }]
    : [];
  return [
    { heading: 'Liabilities & Equity', lines: [...sectionLines(sheet.liabilities), ...sectionLines(sheet.equity), ...surplus], total: sheet.total_liabilities_and_equity },
    { heading: 'Assets', lines: sectionLines(sheet.assets), total: sheet.total_assets },
  ];
}

function byGroup(rows: FinancialStatements['income_expenditure']['income']): Line[] {
  const groups = new Map<string, Line[]>();
  for (const row of rows) groups.set(row.group_name, [...(groups.get(row.group_name) ?? []), { label: row.account_name, amount: row.amount, kind: 'account' }]);
  return [...groups.entries()].flatMap(([group, lines]) => [
    { label: group, amount: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100, kind: 'group' as const },
    ...lines,
  ]);
}

/** Expenditure | Income; the surplus sits under expenditure (a deficit under income) so both totals agree. */
function incomeExpenditureSides(data: FinancialStatements): [Side, Side] {
  const ie = data.income_expenditure;
  const surplus = ie.surplus;
  const expenditure = byGroup(ie.expense);
  const income = byGroup(ie.income);
  if (surplus > 0) expenditure.push({ label: 'Surplus (excess of income over expenditure)', amount: surplus, kind: 'group' });
  if (surplus < 0) income.push({ label: 'Deficit (excess of expenditure over income)', amount: -surplus, kind: 'group' });
  const total = Math.max(ie.total_income, ie.total_expense);
  return [
    { heading: 'Expenditure', lines: expenditure, total },
    { heading: 'Income', lines: income, total },
  ];
}

function SideTable({ side }: { side: Side }): ReactNode {
  return (
    <div className="space-y-1">
      <h4 className="border-b pb-1 font-semibold">{side.heading}</h4>
      {side.lines.length === 0 && <p className="text-sm text-muted-foreground">Nothing to show.</p>}
      {side.lines.map((line, index) => (
        <div key={`${line.label}-${index}`} className={`flex justify-between text-sm ${line.kind === 'group' ? 'font-medium' : 'pl-4 text-muted-foreground'}`}>
          <span>{line.label}</span>
          <span className="tabular-nums">{formatCurrency(line.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function TotalLine({ side }: { side: Side }): ReactNode {
  return (
    <div className="flex justify-between border-t-2 pt-1 text-sm font-bold">
      <span>Total {side.heading}</span>
      <span className="tabular-nums">{formatCurrency(side.total)}</span>
    </div>
  );
}

/** Horizontal: two columns whose totals share one row; vertical: one column, the right-hand side first. */
function Statement({ title, sides, layout }: { title: string; sides: [Side, Side]; layout: StatementLayout }): ReactNode {
  if (layout === 'vertical') {
    const [left, right] = sides;
    return (
      <section aria-label={title} className="space-y-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {[right, left].map((side) => (
          <div key={side.heading} className="space-y-1">
            <SideTable side={side} />
            <TotalLine side={side} />
          </div>
        ))}
      </section>
    );
  }
  return (
    <section aria-label={title} className="space-y-3">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
        <SideTable side={sides[0]} />
        <SideTable side={sides[1]} />
        <TotalLine side={sides[0]} />
        <TotalLine side={sides[1]} />
      </div>
    </section>
  );
}

function exportRows(statements: Array<[string, [Side, Side]]>): Record<string, unknown>[] {
  return statements.flatMap(([title, sides]) =>
    sides.flatMap((side) => [
      ...side.lines.map((line) => ({ statement: title, side: side.heading, line: line.label, amount: line.amount })),
      { statement: title, side: side.heading, line: `Total ${side.heading}`, amount: side.total },
    ]),
  );
}

/**
 * Financial Statements output (GL-16, screen GL-S14): the balance sheet then
 * the income & expenditure, horizontal (two columns, equal-height totals)
 * or vertical (one column).
 */
export function FinancialStatementsView({ data, layout }: { data: FinancialStatements; layout: StatementLayout }): ReactNode {
  const statements: Array<[string, [Side, Side]]> = [
    [`Balance Sheet as of ${formatDate(data.to_date)}`, balanceSheetSides(data)],
    [`Income & Expenditure, ${formatDate(data.from_date)} to ${formatDate(data.to_date)}`, incomeExpenditureSides(data)],
  ];
  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 print:hidden">
        <ExportButton
          data={exportRows(statements)}
          filename={`financial-statements-${data.to_date}`}
          columns={[{ key: 'statement', label: 'Statement' }, { key: 'side', label: 'Side' }, { key: 'line', label: 'Group / Account' }, { key: 'amount', label: 'Amount' }]}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
      </div>
      {statements.map(([title, sides]) => (
        <Statement key={title} title={title} sides={sides} layout={layout} />
      ))}
    </div>
  );
}
