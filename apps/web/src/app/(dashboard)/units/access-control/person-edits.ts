import type { AdminPerson, ModuleSwitch } from '@/hooks/use-access-control';

/**
 * Access Control (UNIT-22 / UNIT-23): what the page changed for each person
 * before Save Changes — designation, e-mail access and module switches — and
 * what that sends.
 */
export interface PersonEdit {
  designation?: string | null;
  email_access_disabled?: boolean;
  modules?: Readonly<Record<string, boolean>>;
}

export type PersonEdits = Readonly<Record<string, PersonEdit>>;

export function withEdit(edits: PersonEdits, userId: string, patch: PersonEdit): PersonEdits {
  const current = edits[userId] ?? {};
  const modules = patch.modules ? { ...(current.modules ?? {}), ...patch.modules } : current.modules;
  return { ...edits, [userId]: { ...current, ...patch, ...(modules ? { modules } : {}) } };
}

/** The PATCH /rbac/people/:id body, or null when nothing of it changed. */
export function personChanges(person: AdminPerson, edit: PersonEdit): { designation?: string | null; email_access_disabled?: boolean } | null {
  const changes: { designation?: string | null; email_access_disabled?: boolean } = {};
  if (edit.designation !== undefined && (edit.designation || null) !== (person.designation || null)) changes.designation = edit.designation || null;
  if (edit.email_access_disabled !== undefined && edit.email_access_disabled !== person.email_access_disabled) {
    changes.email_access_disabled = edit.email_access_disabled;
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/** The PUT /rbac/people/:id/modules rows that differ from what is stored. */
export function moduleChanges(stored: readonly ModuleSwitch[], edit: PersonEdit): Array<{ module_id: string; enabled: boolean }> {
  return Object.entries(edit.modules ?? {})
    .filter(([id, enabled]) => stored.find((module) => module.module_id === id)?.enabled !== enabled)
    .map(([module_id, enabled]) => ({ module_id, enabled }));
}

/** "n Access": the person's modules on, with the page's unsaved switches. */
export function accessCount(person: AdminPerson, stored: readonly ModuleSwitch[] | undefined, edit: PersonEdit | undefined): number {
  if (!stored || !edit?.modules) return person.access_count;
  return stored.filter((module) => edit.modules?.[module.module_id] ?? module.enabled).length;
}
