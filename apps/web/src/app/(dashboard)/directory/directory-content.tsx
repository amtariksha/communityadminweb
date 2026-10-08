'use client';

import { useState } from 'react';
import {
  Store,
  Phone,
  MapPin,
  Clock,
  Star,
  Plus,
  Search,
  Trash2,
  Edit2,
  ShieldAlert,
  Tag,
  Award,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import {
  useBusinessCategories,
  useCreateBusinessCategory,
  useBusinessListings,
  useCreateBusinessListing,
  useUpdateBusinessListing,
  useDeleteBusinessListing,
  useEmergencyContacts,
  useCreateEmergencyContact,
  useUpdateEmergencyContact,
  useDeleteEmergencyContact,
  useOffers,
  useCreateOffer,
  useDeleteOffer,
  useClubMembers,
  useUpdateClubMemberStatus,
  type BusinessListing,
  type EmergencyContact,
  type OfferItem,
  type ClubMember,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

type DirectoryTab = 'businesses' | 'emergency' | 'offers' | 'club';

export function DirectoryContent() {
  const { addToast: toast } = useToast();
  const [activeTab, setActiveTab] = useState<DirectoryTab>('businesses');

  // Business state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [businessSearch, setBusinessSearch] = useState('');
  const { data: categories = [] } = useBusinessCategories();
  const { data: listings = [], isLoading: isListingsLoading } = useBusinessListings(
    selectedCategory,
    undefined,
    businessSearch,
  );
  const createCategoryMutation = useCreateBusinessCategory();
  const createListingMutation = useCreateBusinessListing();
  const updateListingMutation = useUpdateBusinessListing();
  const deleteListingMutation = useDeleteBusinessListing();

  // Emergency state
  const [emergencyCategory, setEmergencyCategory] = useState<string>('all');
  const { data: emergencyContacts = [], isLoading: isEmergencyLoading } = useEmergencyContacts(
    emergencyCategory,
  );
  const createEmergencyMutation = useCreateEmergencyContact();
  const deleteEmergencyMutation = useDeleteEmergencyContact();

  // Offers state
  const { data: offers = [], isLoading: isOffersLoading } = useOffers();
  const createOfferMutation = useCreateOffer();
  const deleteOfferMutation = useDeleteOffer();

  // Club members state
  const { data: clubMembers = [], isLoading: isClubLoading } = useClubMembers();
  const updateClubStatusMutation = useUpdateClubMemberStatus();

  // Dialog open states
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddEmergencyOpen, setIsAddEmergencyOpen] = useState(false);
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);

  // Forms
  const [businessForm, setBusinessForm] = useState({
    category_id: '',
    business_name: '',
    phone: '',
    address: '',
    working_hours: '9:00 AM - 9:00 PM',
    website: '',
    rating: 4.5,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: 'Store',
  });

  const [emergencyForm, setEmergencyForm] = useState({
    name: '',
    phone: '',
    category: 'hospital' as EmergencyContact['category'],
    address: '',
    available_24_7: true,
  });

  const [offerForm, setOfferForm] = useState({
    title: '',
    merchant_name: '',
    promo_code: '',
    discount_description: '',
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    terms: '',
  });

  // Handlers
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessForm.business_name.trim() || !businessForm.category_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category and provide business name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createListingMutation.mutateAsync({
        category_id: businessForm.category_id,
        business_name: businessForm.business_name,
        phone: businessForm.phone || null,
        address: businessForm.address || null,
        working_hours: businessForm.working_hours || null,
        website: businessForm.website || null,
        rating: Number(businessForm.rating),
        status: 'active',
      });
      toast({ title: 'Business Listed', description: 'Listing published to directory.' });
      setIsAddBusinessOpen(false);
    } catch {
      toast({
        title: 'Operation Failed',
        description: 'Could not create business listing.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    try {
      await createCategoryMutation.mutateAsync({
        name: categoryForm.name.trim(),
        icon: categoryForm.icon,
      });
      toast({ title: 'Category Created', description: 'New business category added.' });
      setIsAddCategoryOpen(false);
      setCategoryForm({ name: '', icon: 'Store' });
    } catch {
      toast({
        title: 'Operation Failed',
        description: 'Could not create category.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyForm.name.trim() || !emergencyForm.phone.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide contact name and phone number.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createEmergencyMutation.mutateAsync({
        name: emergencyForm.name,
        phone: emergencyForm.phone,
        category: emergencyForm.category,
        address: emergencyForm.address || null,
        available_24_7: emergencyForm.available_24_7,
      });
      toast({ title: 'Emergency Contact Saved', description: 'Added to emergency directory.' });
      setIsAddEmergencyOpen(false);
    } catch {
      toast({
        title: 'Operation Failed',
        description: 'Could not create emergency contact.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.title.trim() || !offerForm.merchant_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide deal title and merchant name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createOfferMutation.mutateAsync({
        title: offerForm.title,
        merchant_name: offerForm.merchant_name,
        promo_code: offerForm.promo_code || null,
        discount_description: offerForm.discount_description || null,
        valid_until: offerForm.valid_until || null,
        terms: offerForm.terms || null,
        status: 'active',
      });
      toast({ title: 'Offer Published', description: 'Resident deal published.' });
      setIsAddOfferOpen(false);
    } catch {
      toast({
        title: 'Operation Failed',
        description: 'Could not create offer.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateClubStatus = async (id: string, status: 'active' | 'rejected') => {
    try {
      await updateClubStatusMutation.mutateAsync({ id, status });
      toast({
        title: 'Membership Updated',
        description: `Status marked as ${status}.`,
      });
    } catch {
      toast({
        title: 'Update Failed',
        description: 'Could not update membership status.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Local Directory & Lifestyle</h1>
          <p className="text-sm text-muted-foreground">
            Neighborhood businesses, emergency helpline desk, resident merchant offers, and clubhouse memberships.
          </p>
        </div>

        {activeTab === 'businesses' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
            <Button size="sm" onClick={() => setIsAddBusinessOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Business
            </Button>
          </div>
        )}

        {activeTab === 'emergency' && (
          <Button size="sm" onClick={() => setIsAddEmergencyOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Emergency Contact
          </Button>
        )}

        {activeTab === 'offers' && (
          <Button size="sm" onClick={() => setIsAddOfferOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Post Resident Deal
          </Button>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('businesses')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'businesses'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Store className="h-4 w-4" />
          Local Businesses ({listings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('emergency')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'emergency'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert className="h-4 w-4 text-red-500" />
          Emergency Desk ({emergencyContacts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('offers')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'offers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag className="h-4 w-4" />
          Resident Deals & Offers ({offers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('club')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'club'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="h-4 w-4" />
          Club Memberships ({clubMembers.length})
        </button>
      </div>

      {/* Tab 1: Local Businesses */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === c.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {c.name} ({c.listing_count ?? 0})
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search businesses..."
                value={businessSearch}
                onChange={(e) => setBusinessSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isListingsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse h-44" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Store className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <CardTitle className="text-base">No businesses listed</CardTitle>
              <CardDescription className="max-w-sm mt-1">
                There are no local business listings in this category. Click "+ Add Business" to add pharmacies, groceries, laundries, etc.
              </CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((item) => (
                <Card key={item.id} className="flex flex-col border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.category_name ?? 'Local Business'}
                      </Badge>
                      {item.rating > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {Number(item.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base mt-1.5">{item.business_name}</CardTitle>
                    {item.address && (
                      <CardDescription className="flex items-center gap-1 text-xs truncate">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{item.address}</span>
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 space-y-2 text-xs text-muted-foreground pb-3">
                    {item.working_hours && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{item.working_hours}</span>
                      </div>
                    )}
                    {item.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        <a
                          href={`tel:${item.phone}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {item.phone}
                        </a>
                      </div>
                    )}
                    {item.website && (
                      <div className="flex items-center gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        <a
                          href={item.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {item.website}
                        </a>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex items-center justify-end border-t bg-muted/20 px-3 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteListingMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Emergency Desk */}
      {activeTab === 'emergency' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['all', 'hospital', 'ambulance', 'police', 'fire', 'internal'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setEmergencyCategory(cat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    emergencyCategory === cat
                      ? 'bg-red-600 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {cat}
                </button>
              ),
            )}
          </div>

          {isEmergencyLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse h-36" />
              ))}
            </div>
          ) : emergencyContacts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <ShieldAlert className="h-10 w-10 text-red-500 mb-2 opacity-70" />
              <CardTitle className="text-base">No emergency contacts logged</CardTitle>
              <CardDescription className="max-w-sm mt-1">
                Add nearest hospitals, ambulance services, fire stations, and gate security intercom numbers.
              </CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {emergencyContacts.map((contact) => (
                <Card key={contact.id} className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="destructive" className="capitalize text-xs">
                        {contact.category}
                      </Badge>
                      {contact.available_24_7 && (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                          24/7 Available
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base mt-2">{contact.name}</CardTitle>
                    {contact.address && (
                      <CardDescription className="text-xs truncate">{contact.address}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3 pt-1">
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center justify-center gap-2 rounded-md bg-red-50 dark:bg-red-950/40 p-2 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {contact.phone}
                    </a>
                  </CardContent>
                  <CardFooter className="flex justify-end border-t bg-muted/20 px-3 py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deleteEmergencyMutation.mutate(contact.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Resident Deals & Offers */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          {isOffersLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse h-40" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Tag className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <CardTitle className="text-base">No active resident deals</CardTitle>
              <CardDescription className="max-w-sm mt-1">
                Post exclusive coupons, partnership deals with local supermarkets, car washes, or broadband providers.
              </CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <Card key={offer.id} className="flex flex-col border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {offer.merchant_name}
                      </span>
                      <Badge variant={offer.status === 'active' ? 'default' : 'secondary'}>
                        {offer.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-1">{offer.title}</CardTitle>
                    {offer.discount_description && (
                      <CardDescription className="text-xs font-medium text-foreground">
                        {offer.discount_description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2 text-xs text-muted-foreground pb-3">
                    {offer.promo_code && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-muted-foreground">Promo Code:</span>
                        <code className="rounded bg-muted px-2 py-0.5 font-mono font-bold text-foreground">
                          {offer.promo_code}
                        </code>
                      </div>
                    )}
                    {offer.valid_until && (
                      <p>Valid Until: {formatDate(offer.valid_until)}</p>
                    )}
                    {offer.terms && <p className="line-clamp-2 text-[11px]">{offer.terms}</p>}
                  </CardContent>
                  <CardFooter className="flex justify-end border-t bg-muted/20 px-3 py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deleteOfferMutation.mutate(offer.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Club Memberships */}
      {activeTab === 'club' && (
        <div className="space-y-4">
          {isClubLoading ? (
            <Card className="animate-pulse h-40" />
          ) : clubMembers.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Award className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <CardTitle className="text-base">No club memberships registered</CardTitle>
              <CardDescription className="max-w-sm mt-1">
                Resident gym, swimming pool, badminton, and clubhouse memberships will appear here.
              </CardDescription>
            </Card>
          ) : (
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
                    <tr>
                      <th className="p-3">Member</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3">Membership Type</th>
                      <th className="p-3">Monthly Fee</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Valid Until</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clubMembers.map((cm) => (
                      <tr key={cm.id} className="hover:bg-muted/20">
                        <td className="p-3 font-semibold text-foreground">
                          {cm.member_name ?? 'Resident Member'}
                        </td>
                        <td className="p-3 text-muted-foreground">{cm.unit_number ?? 'N/A'}</td>
                        <td className="p-3 font-medium capitalize">{cm.membership_type}</td>
                        <td className="p-3 font-mono">₹{cm.monthly_fee}</td>
                        <td className="p-3">
                          <Badge
                            variant={
                              cm.status === 'active'
                                ? 'default'
                                : cm.status === 'pending'
                                ? 'outline'
                                : 'destructive'
                            }
                            className="capitalize text-[10px]"
                          >
                            {cm.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {cm.valid_until ? formatDate(cm.valid_until) : 'Indefinite'}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {cm.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleUpdateClubStatus(cm.id, 'active')}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 text-destructive"
                                onClick={() => handleUpdateClubStatus(cm.id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Business Modal */}
      <Dialog open={isAddBusinessOpen} onOpenChange={setIsAddBusinessOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveBusiness}>
            <DialogHeader>
              <DialogTitle>Add Local Business</DialogTitle>
              <DialogDescription>
                List a neighborhood store, vendor, or clinic for residents.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="biz-cat">Category *</Label>
                <select
                  id="biz-cat"
                  value={businessForm.category_id}
                  onChange={(e) => setBusinessForm({ ...businessForm, category_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  required
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Business Name *</Label>
                <Input
                  id="biz-name"
                  placeholder="e.g. Apollo Pharmacy (Gate 2)"
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="biz-phone">Phone Number</Label>
                  <Input
                    id="biz-phone"
                    placeholder="+91 98765 43210"
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="biz-rating">Rating (0-5)</Label>
                  <Input
                    id="biz-rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={businessForm.rating}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, rating: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="biz-hours">Operating Hours</Label>
                <Input
                  id="biz-hours"
                  placeholder="e.g. 8:00 AM - 10:00 PM"
                  value={businessForm.working_hours}
                  onChange={(e) => setBusinessForm({ ...businessForm, working_hours: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="biz-addr">Address / Location</Label>
                <Input
                  id="biz-addr"
                  placeholder="e.g. Shopping Arcade Shop #4"
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="biz-web">Website / Online Order URL</Label>
                <Input
                  id="biz-web"
                  placeholder="https://..."
                  value={businessForm.website}
                  onChange={(e) => setBusinessForm({ ...businessForm, website: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddBusinessOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createListingMutation.isPending}>
                Save Listing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleSaveCategory}>
            <DialogHeader>
              <DialogTitle>Add Business Category</DialogTitle>
              <DialogDescription>
                Group businesses by type (Pharmacy, Grocery, Laundry, Clinic).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Category Name *</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Medical & Pharmacies"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCategoryMutation.isPending}>
                Create Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Emergency Contact Modal */}
      <Dialog open={isAddEmergencyOpen} onOpenChange={setIsAddEmergencyOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveEmergency}>
            <DialogHeader>
              <DialogTitle>Add Emergency Contact</DialogTitle>
              <DialogDescription>
                Emergency desk numbers for ambulance, police, fire, or gate security.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="em-name">Contact / Authority Name *</Label>
                <Input
                  id="em-name"
                  placeholder="e.g. Max Hospital Emergency"
                  value={emergencyForm.name}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="em-phone">Phone Number *</Label>
                  <Input
                    id="em-phone"
                    placeholder="102 or +91 11 2345 6789"
                    value={emergencyForm.phone}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="em-cat">Emergency Type</Label>
                  <select
                    id="em-cat"
                    value={emergencyForm.category}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        category: e.target.value as EmergencyContact['category'],
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  >
                    <option value="hospital">Hospital</option>
                    <option value="ambulance">Ambulance</option>
                    <option value="police">Police</option>
                    <option value="fire">Fire Brigade</option>
                    <option value="internal">Society Security Gate</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="em-addr">Hospital / Station Address</Label>
                <Input
                  id="em-addr"
                  placeholder="Sector 12, Main Road (1.5 km away)"
                  value={emergencyForm.address}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, address: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddEmergencyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEmergencyMutation.isPending}>
                Save Contact
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Offer Modal */}
      <Dialog open={isAddOfferOpen} onOpenChange={setIsAddOfferOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveOffer}>
            <DialogHeader>
              <DialogTitle>Post Resident Deal</DialogTitle>
              <DialogDescription>
                Publish exclusive discounts and promo codes for society residents.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="of-title">Offer Title *</Label>
                <Input
                  id="of-title"
                  placeholder="e.g. 20% Off on Monthly Grocery Orders"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="of-merchant">Merchant / Partner *</Label>
                  <Input
                    id="of-merchant"
                    placeholder="e.g. BigBasket Daily"
                    value={offerForm.merchant_name}
                    onChange={(e) => setOfferForm({ ...offerForm, merchant_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="of-code">Coupon Code</Label>
                  <Input
                    id="of-code"
                    placeholder="e.g. MERAGHAR20"
                    value={offerForm.promo_code}
                    onChange={(e) => setOfferForm({ ...offerForm, promo_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="of-discount">Discount Summary</Label>
                  <Input
                    id="of-discount"
                    placeholder="Flat 20% off up to ₹200"
                    value={offerForm.discount_description}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, discount_description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="of-valid">Valid Until</Label>
                  <Input
                    id="of-valid"
                    type="date"
                    value={offerForm.valid_until}
                    onChange={(e) => setOfferForm({ ...offerForm, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="of-terms">Terms & Conditions</Label>
                <Textarea
                  id="of-terms"
                  rows={2}
                  placeholder="Valid for society residents only on min order ₹500..."
                  value={offerForm.terms}
                  onChange={(e) => setOfferForm({ ...offerForm, terms: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOfferOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOfferMutation.isPending}>
                Publish Deal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
