import type { MoveInFlow, SaveMoveInFlowInput } from '@/hooks/use-move-in-setup';

/** MOVE-S1 as edited: the switch and each person's level (0 = No Access). */
export const VERIFIER_LEVELS = [1, 2] as const;

export interface VerifiersDraft {
  flowEnabled: boolean;
  levels: Record<string, number>;
}

export function draftFrom(flow: MoveInFlow): VerifiersDraft {
  return {
    flowEnabled: flow.flow_enabled,
    levels: Object.fromEntries(flow.grid.people.map((person) => [person.user_id, person.level])),
  };
}

/** "Name (Designation)", as the roster shows a person. */
export function personLabel(person: { name: string | null; designation?: string | null }): string {
  const name = person.name ?? 'Unnamed user';
  return person.designation ? `${name} (${person.designation})` : name;
}

/** With the flow on, each level needs someone (the API refuses otherwise). */
export function verifiersError(draft: VerifiersDraft): string | null {
  if (!draft.flowEnabled) return null;
  const empty = VERIFIER_LEVELS.find((level) => !Object.values(draft.levels).includes(level));
  return empty ? `Choose at least one person for Level ${empty}, or switch the move-in flow off.` : null;
}

export function saveBody(draft: VerifiersDraft): SaveMoveInFlowInput {
  return {
    flow_enabled: draft.flowEnabled,
    people: Object.entries(draft.levels).map(([user_id, level]) => ({ user_id, level })),
  };
}
