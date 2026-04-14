'use client';
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Input } from './input';

interface Unit { id: string; unit_number: string; block?: string | null }

interface UnitSearchSelectProps {
  value: string;
  onChange: (unitId: string) => void;
  units: Unit[];
  placeholder?: string;
}

export function UnitSearchSelect({ value, onChange, units, placeholder = 'Search unit...' }: UnitSearchSelectProps): ReactNode {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = units.filter(u =>
    u.unit_number.toLowerCase().includes(search.toLowerCase()) ||
    (u.block && u.block.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = units.find(u => u.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={isOpen ? search : (selected ? `${selected.unit_number}${selected.block ? ` (${selected.block})` : ''}` : '')}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No units found</div>
          ) : (
            filtered.slice(0, 20).map(u => (
              <button
                key={u.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => { onChange(u.id); setSearch(''); setIsOpen(false); }}
              >
                {u.unit_number}{u.block ? ` (Block ${u.block})` : ''}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
