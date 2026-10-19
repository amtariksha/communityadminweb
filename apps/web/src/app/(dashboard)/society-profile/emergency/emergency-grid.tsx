'use client';

import { type ReactNode } from 'react';
import {
  EditableGrid,
  rowErrorsFromApi,
  type GridChange,
  type GridColumn,
  type GridRowState,
} from '@/components/editable-grid';
import { useToast } from '@/components/ui/toast';
import type { EmergencyContact } from '@/hooks';
import { useSaveEmergencyContacts, type EmergencyContactRow } from '@/hooks/use-emergency-grid';
import { friendlyError } from '@/lib/api-error';

export interface EmergencyValues {
  name: string;
  phone: string;
  category: EmergencyContact['category'];
  available: boolean;
}

// PROF-S6 categories; "Society" is our internal desk.
export const EMERGENCY_CATEGORIES: ReadonlyArray<{ value: EmergencyContact['category']; label: string }> = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'ambulance', label: 'Ambulance' },
  { value: 'police', label: 'Police' },
  { value: 'fire', label: 'Fire Brigade' },
  { value: 'internal', label: 'Society (internal)' },
];

const BLANK_ROWS = 7;
const blank = (): EmergencyValues => ({ name: '', phone: '', category: 'internal', available: true });
const isBlank = (values: EmergencyValues): boolean => values.name.trim() === '' && values.phone.trim() === '';

const COLUMNS: GridColumn<EmergencyValues>[] = [
  { key: 'name', header: 'Name / Agency', kind: 'text', field: 'name', maxLength: 100 },
  { key: 'phone', header: 'Mobile No.', kind: 'text', field: 'phone', maxLength: 20 },
  { key: 'category', header: 'Category', kind: 'select', field: 'category', options: EMERGENCY_CATEGORIES },
  { key: 'available', header: '24×7', kind: 'checkbox', field: 'available' },
];

/** Errors by row key: name and number on every row that is kept. */
export function validateEmergencyRows(rows: readonly GridRowState<EmergencyValues>[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    if (row.inactive || (!row.id && isBlank(row.values))) continue;
    const digits = row.values.phone.replace(/\D/g, '').length;
    if (row.values.name.trim().length < 2) errors[row.key] = 'Enter the name or agency.';
    else if (digits < 3 || digits > 15 || !/^\+?[0-9][0-9 -]*$/.test(row.values.phone.trim())) {
      errors[row.key] = 'Enter a number of 3 to 15 digits (100, 108 are fine).';
    }
  }
  return errors;
}

export function toBulkRows(change: GridChange<EmergencyValues>): EmergencyContactRow[] {
  return change.rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    name: row.values.name.trim(),
    phone: row.values.phone.trim(),
    category: row.values.category,
    available_24_7: row.values.available,
    ...(row.inactive ? { remove: true } : {}),
  }));
}

/**
 * Setup Emergency Numbers (PROF-S6): today's numbers and seven blank rows,
 * one Save for them all. Removed rows are deleted on save.
 */
export function EmergencyGrid({ contacts, readOnly }: { contacts: readonly EmergencyContact[]; readOnly: boolean }): ReactNode {
  const { addToast } = useToast();
  const save = useSaveEmergencyContacts();
  const rows = contacts.map((contact) => ({
    id: contact.id,
    values: { name: contact.name, phone: contact.phone, category: contact.category, available: contact.available_24_7 },
  }));

  async function onSave(change: GridChange<EmergencyValues>) {
    try {
      await save.mutateAsync(toBulkRows(change));
      addToast({ title: 'Emergency numbers saved', variant: 'success' });
      return {};
    } catch (error) {
      addToast({ title: 'Could not save the numbers', description: friendlyError(error), variant: 'destructive' });
      return { rowErrors: rowErrorsFromApi(error, change) };
    }
  }

  return (
    <EditableGrid
      label="Setup Emergency Numbers"
      columns={COLUMNS}
      rows={rows}
      blank={blank}
      isBlank={isBlank}
      spareRows={BLANK_ROWS}
      validate={validateEmergencyRows}
      deactivate={{ header: 'Remove', label: 'Remove' }}
      readOnly={readOnly}
      isSaving={save.isPending}
      emptyText="No emergency numbers yet."
      onSave={onSave}
    />
  );
}
