'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { RESIDENT_TYPES, type AddUserRow } from './add-users-rows';

export interface UnitOption {
  id: string;
  label: string;
}

interface AddUsersGridProps {
  rows: readonly AddUserRow[];
  units: readonly UnitOption[];
  disabled: boolean;
  onChange: (key: string, patch: Partial<AddUserRow>) => void;
}

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50';

const HEADERS = ['#', 'First Name*', 'Last Name', 'Unit No*', 'ISD Code', 'Phone/Mobile*', 'Intercom', 'Resident Type*', 'Email Address', 'Result'];

const RESULT_CLASS = { success: 'text-success', note: 'text-warning', error: 'text-destructive' } as const;

function TextCell(props: { label: string; value: string; disabled: boolean; maxLength?: number; type?: string; onChange: (value: string) => void }): ReactNode {
  return (
    <Input
      aria-label={props.label}
      className="h-9 min-w-24"
      type={props.type ?? 'text'}
      value={props.value}
      maxLength={props.maxLength}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
    />
  );
}

function GridRow({ row, position, props }: { row: AddUserRow; position: number; props: AddUsersGridProps }): ReactNode {
  const set = (patch: Partial<AddUserRow>) => props.onChange(row.key, patch);
  const at = (header: string) => `${header}, row ${position}`;
  return (
    <TableRow>
      <TableCell>{position}</TableCell>
      <TableCell><TextCell label={at('First Name')} value={row.firstName} maxLength={100} disabled={props.disabled} onChange={(firstName) => set({ firstName })} /></TableCell>
      <TableCell><TextCell label={at('Last Name')} value={row.lastName} maxLength={100} disabled={props.disabled} onChange={(lastName) => set({ lastName })} /></TableCell>
      <TableCell>
        <select aria-label={at('Unit No')} className={cn(SELECT_CLASS, 'min-w-28')} value={row.unitId} disabled={props.disabled} onChange={(event) => set({ unitId: event.target.value })}>
          <option value="">Select unit</option>
          {props.units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.label}</option>
          ))}
        </select>
      </TableCell>
      <TableCell className="text-muted-foreground">+91</TableCell>
      <TableCell><TextCell label={at('Phone/Mobile')} value={row.phone} type="tel" disabled={props.disabled} onChange={(phone) => set({ phone })} /></TableCell>
      <TableCell><TextCell label={at('Intercom')} value={row.intercom} maxLength={20} disabled={props.disabled} onChange={(intercom) => set({ intercom })} /></TableCell>
      <TableCell>
        <select aria-label={at('Resident Type')} className={cn(SELECT_CLASS, 'min-w-32')} value={row.residentType} disabled={props.disabled} onChange={(event) => set({ residentType: event.target.value as AddUserRow['residentType'] })}>
          <option value="">Select type</option>
          {RESIDENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </TableCell>
      <TableCell><TextCell label={at('Email Address')} value={row.email} type="email" disabled={props.disabled} onChange={(email) => set({ email })} /></TableCell>
      <TableCell className="min-w-40">
        {row.result && <span className={cn('text-xs', RESULT_CLASS[row.result.tone])}>{row.result.text}</span>}
      </TableCell>
    </TableRow>
  );
}

/** The Add Users grid (UNIT-S3): numbered rows typed in place, each with its result. */
export function AddUsersGrid(props: AddUsersGridProps): ReactNode {
  return (
    <div className="overflow-x-auto">
      <Table aria-label="Add Users">
        <TableHeader>
          <TableRow>
            {HEADERS.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.map((row, index) => (
            <GridRow key={row.key} row={row} position={index + 1} props={props} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
