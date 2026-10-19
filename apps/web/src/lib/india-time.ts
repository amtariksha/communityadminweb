/** Dates and times on India's clock for list cells; `—` when there is none. */

const IST = 'Asia/Kolkata';

/** `19 Oct 2026` on India's calendar; `—` when there is no date. */
export function indiaDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST });
}

/** `09:45 am` on India's clock; `—` when there is no time. */
export function indiaTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: IST });
}

export function indiaDateTime(iso: string | null | undefined): string {
  return iso ? `${indiaDate(iso)} ${indiaTime(iso)}` : '—';
}
