import { type ReactNode } from 'react';
import { AttendanceContent } from './attendance-content';
import { AttendanceMatrix } from './attendance-matrix';

// Staff Manager › Attendance (STAFF-44, screen STAFF-S4): the range matrix;
// an API without it keeps today's one-day list (STAFF-10).
export default function Page(): ReactNode {
  return <AttendanceMatrix fallback={<AttendanceContent />} />;
}
