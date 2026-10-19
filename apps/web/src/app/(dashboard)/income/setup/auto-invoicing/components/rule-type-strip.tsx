import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const RULE_TYPES = ['Standard Rule', 'Simple Multiplier', 'Simple NOC', 'Slab Based Rule', 'Advanced NOC'] as const;

/**
 * The rule-type strip of Add / Edit Line Item (INC-S3). Only the Standard
 * rule is built (decision D8); the other four are shown, not selectable.
 */
export function RuleTypeStrip(): ReactNode {
  return (
    <div role="group" aria-label="Rule type" className="flex flex-wrap gap-2">
      {RULE_TYPES.map((label, index) => {
        const standard = index === 0;
        return (
          <button
            key={label}
            type="button"
            disabled={!standard}
            aria-pressed={standard}
            title={standard ? undefined : 'Not available yet'}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm',
              standard ? 'border-primary bg-primary text-primary-foreground' : 'cursor-not-allowed opacity-50',
            )}
          >
            {label}
            {!standard && <span className="sr-only"> (not available yet)</span>}
          </button>
        );
      })}
    </div>
  );
}
