'use client';

import { useMemo, useState } from 'react';

/** The month the calendar shows, the picked day, and moving between months. */
export function useCalendarMonth() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  function shift(by: -1 | 1): void {
    const next = new Date(year, month + by, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDate(null);
  }

  function goToToday(): void {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(today);
  }

  return {
    today,
    year,
    month,
    selectedDate,
    setSelectedDate,
    prev: () => shift(-1),
    next: () => shift(1),
    goToToday,
  };
}
