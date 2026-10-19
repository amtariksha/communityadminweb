'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UnitDuesSearchField } from '@/hooks/use-unit-ledger';

const FIELDS: ReadonlyArray<{ value: UnitDuesSearchField; label: string }> = [
  { value: 'primary_contact', label: 'Primary Contact' },
  { value: 'bill_to', label: 'Bill to Party' },
  { value: 'unit', label: 'Unit' },
  { value: 'any', label: 'Any' },
];

interface DuesSearchProps {
  value: string;
  field: UnitDuesSearchField;
  onSearch: (text: string, field: UnitDuesSearchField) => void;
}

/** The workbench search (INC-S16): text, the field it looks in, and Search. */
export function DuesSearch({ value, field, onSearch }: DuesSearchProps): ReactNode {
  const [text, setText] = useState(value);
  const [draftField, setDraftField] = useState<UnitDuesSearchField>(field);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSearch(text.trim(), draftField);
  }

  return (
    <form role="search" onSubmit={submit} className="flex flex-wrap items-center gap-3">
      <Input
        type="search"
        aria-label="Search units"
        className="w-64"
        placeholder="Name or unit"
        value={text}
        maxLength={100}
        onChange={(event) => setText(event.target.value)}
      />
      <fieldset className="flex flex-wrap items-center gap-3 text-sm">
        <legend className="sr-only">Search in</legend>
        {FIELDS.map((option) => (
          <label key={option.value} className="flex items-center gap-1">
            <input
              type="radio"
              name="dues-search-field"
              value={option.value}
              checked={draftField === option.value}
              onChange={() => setDraftField(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" size="sm">
        Search
      </Button>
    </form>
  );
}
