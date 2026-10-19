import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RuleLine, RuleTypeGroup } from '@/hooks/use-billing-rules';
import { gstText, ruleText } from './rule-text';

interface RuleTypeTableProps {
  group: RuleTypeGroup;
  canWrite: boolean;
  onAdd: () => void;
  onRevise: (line: RuleLine) => void;
  /** Preview Invoice / Clone Rules for this type (INC-18). */
  actions?: ReactNode;
}

/** Only the latest version of an account's line can be revised or ended. */
export function isLatestVersion(line: RuleLine, lines: readonly RuleLine[]): boolean {
  return !lines.some((other) => other.ledger_account_id === line.ledger_account_id && other.effective_from > line.effective_from);
}

function EffectiveFrom({ line }: { line: RuleLine }): ReactNode {
  return (
    <span>
      {line.effective_from}
      {line.status === 'scheduled' && <span className="ml-1 text-xs text-muted-foreground">(from then)</span>}
      {line.effective_to && <span className="block text-xs text-muted-foreground">until {line.effective_to}</span>}
    </span>
  );
}

/** One unit type's rule lines on Setup › Auto Invoicing (INC-S1). */
export function RuleTypeTable({ group, canWrite, onAdd, onRevise, actions }: RuleTypeTableProps): ReactNode {
  const title = `Rules for Unit Type : ${group.category.name}`;
  return (
    <section aria-label={title} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {actions}
      </div>
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead>Income Account</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead>GST Applicable</TableHead>
            <TableHead>Apply Interest</TableHead>
            <TableHead>Effective From</TableHead>
            <TableHead>Revise</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>{line.account_name}</TableCell>
              <TableCell>{ruleText(line)}</TableCell>
              <TableCell>{gstText(line)}</TableCell>
              <TableCell>{line.interest_applicable ? 'Yes' : 'No'}</TableCell>
              <TableCell>
                <EffectiveFrom line={line} />
              </TableCell>
              <TableCell>
                {canWrite && isLatestVersion(line, group.lines) ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => onRevise(line)}>
                    Edit Line Item
                  </Button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={4} className="text-sm text-muted-foreground">
              GST only above ₹7,500 a month: {group.category.gst_threshold_applies ? 'Yes' : 'No'}
            </TableCell>
            <TableCell colSpan={2} className="text-right">
              {canWrite && (
                <Button type="button" size="sm" onClick={onAdd}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Line Item
                </Button>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  );
}
