'use client';

import { Suspense, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { MetersTab } from '../../meters-tab';

function Meters(): ReactNode {
  const params = useSearchParams();
  const [meterType, setMeterType] = useState('');
  const addFor = params?.get('add') === '1' ? params.get('unit') : null;
  return <MetersTab meterTypeFilter={meterType} setMeterTypeFilter={setMeterType} addForUnit={addFor} />;
}

// Utility Tracker › Track Utility Flats › Meters (UTIL-10: our meter register as a sub-tab).
export default function UtilityMetersPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <Meters />
    </Suspense>
  );
}
