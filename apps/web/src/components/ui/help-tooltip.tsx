import { HelpCircle } from 'lucide-react';
import { Tooltip, type TooltipProps } from './tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  text: string;
  side?: TooltipProps['side'];
  className?: string;
  iconClassName?: string;
}

function HelpTooltip({
  text,
  side = 'top',
  className,
  iconClassName,
}: HelpTooltipProps) {
  return (
    <Tooltip content={text} side={side} className={className}>
      <HelpCircle
        className={cn(
          'h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0',
          iconClassName,
        )}
      />
    </Tooltip>
  );
}

export { HelpTooltip };
export type { HelpTooltipProps };
