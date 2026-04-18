import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn, DATE_INPUT_MIN, DATE_INPUT_MAX } from '@/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, min, max, ...props },
  ref,
) {
  // Auto-apply sane bounds to `<input type="date">` so users can't enter
  // year 5685 or similar nonsense. Callers can still override with
  // explicit min/max props (e.g. financialDateBounds() on ledger inputs).
  const appliedMin = type === 'date' && min === undefined ? DATE_INPUT_MIN : min;
  const appliedMax = type === 'date' && max === undefined ? DATE_INPUT_MAX : max;

  return (
    <input
      type={type}
      min={appliedMin}
      max={appliedMax}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
