'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAmenities } from '@/hooks';
import { AmenityForm } from '../../components/amenity-form';

const SETUP = '/amenities/setup';

// Amenity & Event › Edit Amenity (classic, AMEN-10, screen AMEN-S2 as a page).
export default function Page(): ReactNode {
  const router = useRouter();
  const { amenityId } = useParams<{ amenityId: string }>();
  const amenitiesQuery = useAmenities();
  if (amenitiesQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  const amenity = amenitiesQuery.data?.data.find((row) => row.id === amenityId);
  if (!amenity) {
    return (
      <p className="text-sm">
        Amenity not found.{' '}
        <Link href={SETUP} className="text-primary hover:underline">
          Back to Setup
        </Link>
      </p>
    );
  }
  return <AmenityForm key={amenity.id} mode="page" amenity={amenity} onClose={() => router.push(SETUP)} onSaved={() => router.push(SETUP)} />;
}
