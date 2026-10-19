'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useUnitBlocks, type UnitBlock } from '@/hooks/use-unit-blocks';
import { cn } from '@/lib/utils';

export interface BlockLinksProps {
  blocks: readonly UnitBlock[];
  totalUnits: number;
  /** The block shown now; null = All Blocks; undefined = none chosen yet (INC-35). */
  value: string | null | undefined;
  /** A link per block (route-based lists) … */
  hrefFor?: (block: string | null) => string;
  /** … or a callback (lists filtered in place). */
  onChange?: (block: string | null) => void;
}

const linkClass = (active: boolean): string =>
  cn(
    'rounded px-2 py-1 text-sm transition-colors',
    active ? 'bg-primary text-primary-foreground' : 'text-primary hover:underline',
  );

function BlockLink({ props, block, label }: { props: BlockLinksProps; block: string | null; label: string }): ReactNode {
  const active = props.value === block;
  if (props.hrefFor) {
    return (
      <Link href={props.hrefFor(block)} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" aria-pressed={active} className={linkClass(active)} onClick={() => props.onChange?.(block)}>
      {label}
    </button>
  );
}

/**
 * Block links (requirements SB-10): All Blocks, then one link per block in
 * the society's order, each with its unit count, above a unit-based list.
 */
export function BlockLinks(props: BlockLinksProps): ReactNode {
  return (
    <nav aria-label="Blocks" className="flex flex-wrap items-center gap-1">
      <BlockLink props={props} block={null} label={`All Blocks (${props.totalUnits})`} />
      {props.blocks.map((block) => (
        <BlockLink key={block.name} props={props} block={block.name} label={`${block.name} (${block.unit_count})`} />
      ))}
    </nav>
  );
}

/** BlockLinks over GET /unit-blocks; shows nothing until the API answers. */
export function UnitBlockLinks(props: Omit<BlockLinksProps, 'blocks' | 'totalUnits'>): ReactNode {
  const query = useUnitBlocks();
  if (!query.data || query.data.data.length === 0) return null;
  return <BlockLinks {...props} blocks={query.data.data} totalUnits={query.data.total_units} />;
}
