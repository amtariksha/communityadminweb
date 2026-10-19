'use client';

import { useState, type ReactNode } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Search, ShieldCheck, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useServiceRatings, useTopRated, useVerifyRating } from '@/hooks';
import type { RatingFilters, ServiceRating, TopRatedProvider } from '@/hooks/use-ratings';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

function StarRating({ rating }: { rating: number }): ReactNode {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

/** Residents' ratings of service providers, and the top rated. */
export function VendorRatingsTab(): ReactNode {
  const { addToast } = useToast();
  const [ratingServiceFilter, setRatingServiceFilter] = useState('');
  const [ratingSearchInput, setRatingSearchInput] = useState('');
  const [ratingSearchQuery, setRatingSearchQuery] = useState('');
  const [ratingPage, setRatingPage] = useState(1);
  const ratingFilters: RatingFilters = {
    service_type: ratingServiceFilter || undefined,
    search: ratingSearchQuery || undefined,
    page: ratingPage,
    limit: ITEMS_PER_PAGE,
  };
  const ratingsQuery = useServiceRatings(ratingFilters);
  const topRatedQuery = useTopRated();
  const verifyRating = useVerifyRating();
  const ratings: ServiceRating[] = ratingsQuery.data?.data ?? [];
  const totalRatings = ratingsQuery.data?.total ?? 0;
  const totalRatingPages = Math.max(1, Math.ceil(totalRatings / ITEMS_PER_PAGE));
  const topRated: TopRatedProvider[] = topRatedQuery.data ?? [];

  function handleVerifyRating(id: string): void {
    verifyRating.mutate(id, {
      onSuccess() {
        addToast({ title: 'Rating verified', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to verify rating', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function handleRatingSearch(): void {
    setRatingSearchQuery(ratingSearchInput);
    setRatingPage(1);
  }

  return (
    <>
      {/* Top Rated Providers */}
      {topRated.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-yellow-500" />
              Top Rated Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {topRated.map((provider) => (
                <div key={provider.provider_phone} className="rounded-md border p-3 space-y-1.5">
                  <p className="font-medium text-sm">{provider.provider_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{provider.service_type}</p>
                  <StarRating rating={provider.avg_rating} />
                  <p className="text-xs text-muted-foreground">{provider.review_count} review{provider.review_count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Ratings table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Ratings</CardTitle>
            <div className="flex gap-2">
              <Select
                value={ratingServiceFilter}
                onChange={(e) => { setRatingServiceFilter(e.target.value); setRatingPage(1); }}
                className="w-40"
              >
                <option value="">All Services</option>
                <option value="plumber">Plumber</option>
                <option value="electrician">Electrician</option>
                <option value="carpenter">Carpenter</option>
                <option value="painter">Painter</option>
                <option value="cleaner">Cleaner</option>
                <option value="security">Security</option>
                <option value="gardener">Gardener</option>
                <option value="other">Other</option>
              </Select>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search provider..."
                  value={ratingSearchInput}
                  onChange={(e) => setRatingSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRatingSearch();
                  }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleRatingSearch}>
                Search
              </Button>
            </div>
          </div>
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
                <TableHead>Reviewer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratingsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : ratings.length > 0 ? (
                ratings.map((rating) => (
                  <TableRow key={rating.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rating.provider_name}</p>
                        <p className="text-xs text-muted-foreground">{rating.provider_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{rating.service_type}</TableCell>
                    <TableCell>
                      <StarRating rating={rating.rating} />
                    </TableCell>
                    <TableCell>
                      <p className="max-w-48 truncate text-sm text-muted-foreground" title={rating.review}>
                        {rating.review || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      {rating.is_verified ? (
                        <Badge variant="success" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{rating.reviewer_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(rating.created_at)}</TableCell>
                    <TableCell>
                      {!rating.is_verified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleVerifyRating(rating.id)}
                          title="Verify rating"
                          disabled={verifyRating.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No ratings found. Ratings will appear here as residents review service providers.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalRatingPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {ratingPage} of {totalRatingPages} ({totalRatings} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ratingPage <= 1}
                  onClick={() => setRatingPage(ratingPage - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ratingPage >= totalRatingPages}
                  onClick={() => setRatingPage(ratingPage + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
