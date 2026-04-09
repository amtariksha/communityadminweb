'use client';

import { useState, type ReactNode } from 'react';
import { Trash2, ShieldCheck, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useMarketplaceListings,
  useServiceRatings,
  useTopRated,
  useRemoveListing,
  useVerifyRating,
} from '@/hooks/use-marketplace';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusVariant(
  status: string,
): 'success' | 'secondary' | 'warning' | 'destructive' {
  switch (status) {
    case 'active':
      return 'success';
    case 'sold':
      return 'secondary';
    case 'reserved':
      return 'warning';
    case 'removed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function renderStars(rating: number): ReactNode {
  const stars: ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-4 w-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
      />,
    );
  }
  return <div className="flex">{stars}</div>;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------

type Tab = 'listings' | 'ratings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'listings', label: 'Listings' },
  { key: 'ratings', label: 'Service Ratings' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MarketplaceContent(): ReactNode {
  const [activeTab, setActiveTab] = useState<Tab>('listings');

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Marketplace' }]}
        title="Marketplace"
        description="Manage resident marketplace listings and service provider ratings"
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'listings' && <ListingsTab />}
      {activeTab === 'ratings' && <RatingsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listings Tab
// ---------------------------------------------------------------------------

function ListingsTab(): ReactNode {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const listingsQuery = useMarketplaceListings({
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  });
  const removeMutation = useRemoveListing();
  const listings = listingsQuery.data?.data ?? [];

  function handleRemove(id: string): void {
    removeMutation.mutate(id, {
      onSuccess() {
        addToast({ title: 'Listing removed', variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to remove listing',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Listings</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              <option value="furniture">Furniture</option>
              <option value="electronics">Electronics</option>
              <option value="vehicles">Vehicles</option>
              <option value="appliances">Appliances</option>
              <option value="other">Other</option>
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
              <option value="removed">Removed</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Seller (Unit)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listingsQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : listings.length > 0 ? (
              listings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium">{listing.title}</TableCell>
                  <TableCell>{formatCurrency(listing.price)}</TableCell>
                  <TableCell className="capitalize">{listing.category}</TableCell>
                  <TableCell>
                    {listing.seller_name} ({listing.unit_number})
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(listing.status)} className="capitalize">
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(listing.created_at)}
                  </TableCell>
                  <TableCell>
                    {listing.status !== 'removed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRemove(listing.id)}
                        title="Remove listing"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No listings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Ratings Tab
// ---------------------------------------------------------------------------

function RatingsTab(): ReactNode {
  const { addToast } = useToast();

  const ratingsQuery = useServiceRatings();
  const topRatedQuery = useTopRated();
  const verifyMutation = useVerifyRating();
  const ratings = ratingsQuery.data?.data ?? [];
  const topRated = (topRatedQuery.data as Array<{ provider_name: string; service_type: string; avg_rating: number; total_reviews: number }>) ?? [];

  function handleVerify(id: string): void {
    verifyMutation.mutate(id, {
      onSuccess() {
        addToast({ title: 'Rating verified', variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to verify rating',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Rated Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Rated Providers</CardTitle>
        </CardHeader>
        <CardContent>
          {topRatedQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : topRated.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {topRated.map((provider, idx) => (
                <Card key={idx} className="border">
                  <CardContent className="pt-4">
                    <p className="font-medium">{provider.provider_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {provider.service_type}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {renderStars(Math.round(provider.avg_rating))}
                      <span className="text-sm text-muted-foreground">
                        ({provider.total_reviews} reviews)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">No top rated providers yet.</p>
          )}
        </CardContent>
      </Card>

      {/* All Ratings */}
      <Card>
        <CardHeader>
          <CardTitle>Service Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratingsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : ratings.length > 0 ? (
                ratings.map((rating) => (
                  <TableRow key={rating.id}>
                    <TableCell className="font-medium">{rating.provider_name}</TableCell>
                    <TableCell className="capitalize">{rating.service_type}</TableCell>
                    <TableCell>{renderStars(rating.rating)}</TableCell>
                    <TableCell className="max-w-xs text-muted-foreground">
                      {truncate(rating.review, 80)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rating.is_verified ? 'success' : 'secondary'}>
                        {rating.is_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!rating.is_verified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleVerify(rating.id)}
                          title="Verify rating"
                        >
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No service ratings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
