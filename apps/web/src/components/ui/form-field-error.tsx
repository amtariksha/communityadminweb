import { type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-error';

interface FormFieldErrorBaseProps {
  /** Tailwind overrides (padding, margin-top, etc). */
  className?: string;
  /** Optional id for aria-describedby on the paired input. */
  id?: string;
}

type FormFieldErrorProps = FormFieldErrorBaseProps &
  (
    | {
        /** Raw message string. Component renders nothing when falsy. */
        message: string | undefined;
        error?: never;
        field?: never;
      }
    | {
        /** Mutation / query error object. Pass alongside `field` to
         *  extract the field-level message from `ApiError.fieldErrors`. */
        error: unknown;
        /** Field name the server rejected (e.g. `phone`, `unit_number`). */
        field: string;
        message?: never;
      }
  );

/**
 * Inline field-level error message, rendered directly under the
 * input the server rejected. Two usage modes:
 *
 *   // Mode A — pass a pre-computed message:
 *   <FormFieldError message={phoneError} />
 *
 *   // Mode B — pass the mutation error + field name:
 *   <FormFieldError error={createUnit.error} field="phone" />
 *
 * Renders nothing when there's no message, so forms can drop this
 * under every input unconditionally without layout churn.
 */
export function FormFieldError(props: FormFieldErrorProps): ReactNode {
  let message: string | undefined;
  if ('message' in props && props.message !== undefined) {
    message = props.message;
  } else if (
    'error' in props &&
    typeof props.field === 'string' &&
    props.error instanceof ApiError
  ) {
    message = props.error.fieldErrors[props.field];
  }

  if (!message) return null;
  return (
    <p
      id={props.id}
      role="alert"
      className={cn(
        'mt-1 flex items-start gap-1.5 text-xs text-destructive',
        props.className,
      )}
    >
      <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
}
