'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SCOPES, SEARCH_IN, type RegisterScope, type SearchIn } from './register-filter';

/** The scope radio of the register's filter form (BANK-09); applied with Fetch Transactions. */
export function RegisterScopeRadio({ value, onChange }: { value: RegisterScope; onChange: (scope: RegisterScope) => void }): ReactNode {
  return (
    <fieldset className="flex flex-wrap gap-3">
      <legend className="mb-1 text-sm font-medium">Show</legend>
      {SCOPES.map(([scope, label]) => (
        <label key={scope} className="flex items-center gap-1 text-sm">
          <input type="radio" name="register-scope" checked={value === scope} onChange={() => onChange(scope)} />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

/** The register's Search form: text and Search in (BANK-09), over the fetched period. */
export function RegisterSearchForm({ disabled, onSearch }: { disabled: boolean; onSearch: (q: string, searchIn: SearchIn) => void }): ReactNode {
  const [q, setQ] = useState('');
  const [searchIn, setSearchIn] = useState<SearchIn>('any');
  function submit(event: FormEvent): void {
    event.preventDefault();
    onSearch(q.trim(), searchIn);
  }
  return (
    <form aria-label="Search the register" className="flex flex-wrap items-end gap-3" onSubmit={submit}>
      <div className="space-y-1">
        <Label htmlFor="register-q">Search</Label>
        <Input id="register-q" className="w-56" maxLength={100} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <fieldset className="flex flex-wrap gap-3 pb-2">
        <legend className="sr-only">Search in</legend>
        {SEARCH_IN.map(([value, label]) => (
          <label key={value} className="flex items-center gap-1 text-sm">
            <input type="radio" name="register-search-in" checked={searchIn === value} onChange={() => setSearchIn(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" variant="outline" disabled={disabled}>Search</Button>
    </form>
  );
}
