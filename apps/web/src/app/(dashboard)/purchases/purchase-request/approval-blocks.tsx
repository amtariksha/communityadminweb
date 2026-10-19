'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import type { PRApprovalStepView } from '@/hooks/use-purchase-requests';
import { ROLE_LABELS } from '@/lib/role-catalogue';
import { formatDate } from '@/lib/utils';
import { levelError, type LevelChoice } from './request-state';

/**
 * The Approval block (EXP-S6): one block per level of the SB-11 grid,
 * "Level n * — k approvers · min m". Approvers may be narrowed, never
 * added; the minimum is 1–10 and at most the approvers chosen.
 */
export function ApprovalBlocks(props: {
  levels: readonly LevelChoice[];
  readOnly: boolean;
  onChange: (level: number, changes: Partial<LevelChoice>) => void;
}): ReactNode {
  if (props.levels.length === 0) {
    return <p className="text-sm text-muted-foreground">Approvers follow the society’s purchase approval settings.</p>;
  }
  return (
    <div className="space-y-3">
      {props.levels.map((level) => {
        const problem = levelError(level);
        const toggle = (userId: string, on: boolean) =>
          props.onChange(level.level, {
            selected: on ? [...level.selected, userId] : level.selected.filter((id) => id !== userId),
          });
        return (
          <fieldset key={level.level} className="rounded border p-3">
            <legend className="px-1 text-sm font-medium">
              Level {level.level} * — {level.selected.length} approvers · min {level.min}
            </legend>
            <div className="flex flex-wrap gap-3">
              {level.options.map((option) => (
                <label key={option.user_id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={level.selected.includes(option.user_id)}
                    disabled={props.readOnly}
                    onChange={(e) => toggle(option.user_id, e.target.checked)}
                  />
                  {option.name}
                </label>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm">
              Min approvals
              <Input
                type="number"
                min={1}
                max={10}
                className="h-8 w-20"
                aria-label={`Level ${level.level} min approvals`}
                value={level.min}
                disabled={props.readOnly}
                onChange={(e) => props.onChange(level.level, { min: e.target.value })}
              />
            </label>
            {!props.readOnly && problem && <p className="mt-1 text-xs text-destructive">{problem}</p>}
          </fieldset>
        );
      })}
    </div>
  );
}

const DECISIONS: Readonly<Record<PRApprovalStepView['decision'], string>> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  not_required: 'Not required',
};

function approverOf(step: PRApprovalStepView): string {
  if (step.approver_name) return step.approver_name;
  return step.approver_role ? `Any ${ROLE_LABELS[step.approver_role] ?? step.approver_role}` : '—';
}

/** The approval trail of a sent request: level, approver, decision, date, comment. */
export function ApprovalTrail({ steps }: { steps: readonly PRApprovalStepView[] }): ReactNode {
  return (
    <table className="w-full text-sm" aria-label="Approval trail">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1">Level</th>
          <th>Approver</th>
          <th>Decision</th>
          <th>Date</th>
          <th>Comment</th>
        </tr>
      </thead>
      <tbody>
        {steps.map((step) => (
          <tr key={step.id} className="border-t">
            <td className="py-1">{step.level}</td>
            <td>{approverOf(step)}</td>
            <td>{DECISIONS[step.decision] ?? step.decision}</td>
            <td>{step.decided_at ? formatDate(step.decided_at) : '—'}</td>
            <td>{step.comments ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
