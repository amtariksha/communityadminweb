import { ApiError } from '@/lib/api-error';

/**
 * Read a field-level error message out of an `ApiError` (or return
 * `undefined` for any other error type / no error). Use inside form
 * components to render red helper text under the offending input.
 *
 * Example:
 *   const mutation = useCreateUnit();
 *   const phoneError = useApiFieldError(mutation.error, 'phone');
 *   …
 *   <Input value={phone} onChange={…} />
 *   <FormFieldError message={phoneError} />
 */
export function useApiFieldError(
  err: unknown,
  field: string,
): string | undefined {
  if (!(err instanceof ApiError)) return undefined;
  return err.fieldErrors[field];
}
