'use client';

import { useState } from 'react';
import { currentFinancialYear, lastMonthRanges, todayIST } from '@/lib/date';

export interface ReportDates {
  asOfDate: string;
  setAsOfDate: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  /** As of the current financial year's last day. */
  yearEnd: () => void;
  /** The current financial year, April to March. */
  fullYear: () => void;
  asOfToday: () => void;
  thisMonth: () => void;
}

/**
 * The report page's dates (REP-02): ranges default to the financial year
 * `today` falls in and "Year End" / "Full Year" follow it, instead of the
 * 2025-26 year they were written for. Every date is the India calendar date.
 */
export function useReportDates(today: string = todayIST()): ReportDates {
  const year = currentFinancialYear(today);
  const [asOfDate, setAsOfDate] = useState(today);
  const [startDate, setStartDate] = useState(year.start_date);
  const [endDate, setEndDate] = useState(year.end_date);

  function setRange(start: string, end: string): void {
    setStartDate(start);
    setEndDate(end);
  }

  return {
    asOfDate,
    setAsOfDate,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    yearEnd: () => setAsOfDate(year.end_date),
    fullYear: () => setRange(year.start_date, year.end_date),
    asOfToday: () => setAsOfDate(today),
    thisMonth: () => {
      const [month] = lastMonthRanges(1, today);
      setRange(month.start_date, month.end_date);
    },
  };
}
