import type { ApproverGrid, SaveApproverGridInput } from '@/hooks/use-approver-grid';

/**
 * SB-11 — the grid as edited on screen: each person's level (0 = No
 * Access) and each level's minimum. Saved in one go with Save Changes.
 */
export const GRID_LEVELS = [1, 2, 3] as const;

export interface GridDraft {
  levels: Record<string, number>;
  minimums: Record<number, number>;
}

export function draftFrom(grid: ApproverGrid): GridDraft {
  return {
    levels: Object.fromEntries(grid.people.map((person) => [person.user_id, person.level])),
    minimums: Object.fromEntries(grid.levels.map((level) => [level.level, level.min_approvals])),
  };
}

export function countAt(draft: GridDraft, level: number): number {
  return Object.values(draft.levels).filter((value) => value === level).length;
}

/** The first problem with the draft, or null. A minimum may not exceed the people on its level. */
export function draftError(draft: GridDraft, levels: readonly number[] = GRID_LEVELS): string | null {
  for (const level of levels) {
    const count = countAt(draft, level);
    const min = draft.minimums[level] ?? 1;
    if (!Number.isInteger(min) || min < 1 || min > 10) return `Level ${level}: minimum approvals is a whole number from 1 to 10`;
    if (count > 0 && min > count) return `Level ${level} needs ${min} approvals but has ${count} approvers`;
  }
  return null;
}

/**
 * The PUT body. `levels` are the levels the request type offers (a violation
 * grid has two); `withMinimums` false sends none, for grids where any one
 * approver at a level is enough (RULE-S1, FORM-S1).
 */
export function saveBody(draft: GridDraft, levels: readonly number[] = GRID_LEVELS, withMinimums = true): SaveApproverGridInput {
  return {
    people: Object.entries(draft.levels).map(([user_id, level]) => ({ user_id, level })),
    levels: withMinimums ? levels.map((level) => ({ level, min_approvals: draft.minimums[level] ?? 1 })) : [],
  };
}
