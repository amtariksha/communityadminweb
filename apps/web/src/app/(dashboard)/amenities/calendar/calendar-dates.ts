/** Month grid arithmetic for the reservations calendar. */

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

/** The 6-row grid of a month (0-indexed), padded with the days around it. */
export function buildCalendarDays(year: number, month: number): CalendarDay[] {
  const startDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];
  for (let idx = startDayOfWeek - 1; idx >= 0; idx--) {
    days.push({ date: new Date(year, month, -idx), isCurrentMonth: false });
  }
  for (let day = 1; day <= totalDays; day++) {
    days.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let idx = 1; idx <= remaining; idx++) {
    days.push({ date: new Date(year, month + 1, idx), isCurrentMonth: false });
  }
  return days;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** First and last day of the month shown, as the API's date range. */
export function monthRange(year: number, month: number): { date_from: string; date_to: string } {
  return { date_from: toDateKey(new Date(year, month, 1)), date_to: toDateKey(new Date(year, month + 1, 0)) };
}

const AMENITY_TYPE_COLORS: Record<string, string> = {
  clubhouse: 'bg-blue-500',
  party_hall: 'bg-purple-500',
  guest_room: 'bg-amber-500',
  gym: 'bg-green-500',
  pool: 'bg-cyan-500',
  tennis_court: 'bg-lime-500',
  community_hall: 'bg-indigo-500',
  terrace: 'bg-orange-500',
  ev_charger: 'bg-yellow-500',
};

/** Consistent colour per amenity type for the calendar dots. */
export function amenityColor(type: string): string {
  return AMENITY_TYPE_COLORS[type] ?? 'bg-gray-400';
}
