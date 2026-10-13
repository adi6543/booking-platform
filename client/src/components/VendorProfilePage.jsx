import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVendorProfile as fetchVendorProfile, getVendorReviews, getVendorRatingSummary } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Star, MapPin, Phone, Mail, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';

const CATEGORY_MAP = {
  'plumbing':         { label: 'Plumbing',         icon: '🔧' },
  'salon':            { label: 'Salon & Grooming', icon: '💇' },
  'cleaning':         { label: 'Home Cleaning',    icon: '🧹' },
  'electrician':      { label: 'Electrician',       icon: '⚡' },
  'tutor':            { label: 'Home Tutor',        icon: '📚' },
  'appliance-repair': { label: 'Appliance Repair',  icon: '🔨' },
  'painting':         { label: 'Painting',          icon: '🎨' },
  'carpentry':        { label: 'Carpentry',         icon: '🪵' },
  'other':            { label: 'Other',             icon: '🔩' }
};

function StarRating({ rating, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sizeClass} ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}`}
        />
      ))}
    </div>
  );
}

function RatingBreakdown({ breakdown, total }) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map(star => {
        const count = breakdown[star] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-4 text-zinc-600 font-medium text-right">{star}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-zinc-500 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export default function VendorProfilePage() {
  const { id } = useParams();
  const { error: toastError } = useToast();

  const [data, setData] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [totalReviewPages, setTotalReviewPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchVendorProfile(id),
      getVendorRatingSummary(id),
      getVendorReviews(id, { page: 1, limit: 5 })
    ])
      .then(([profileData, summaryData, reviewsData]) => {
        setData(profileData);
        setRatingSummary(summaryData);
        setReviews(reviewsData.reviews);
        setTotalReviewPages(reviewsData.totalPages);
      })
      .catch(e => toastError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const loadReviewPage = async (page) => {
    try {
      const reviewsData = await getVendorReviews(id, { page, limit: 5 });
      setReviews(reviewsData.reviews);
      setReviewPage(page);
      setTotalReviewPages(reviewsData.totalPages);
    } catch (e) { toastError(e.message); }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-zinc-100 rounded" />
          <div className="h-4 w-96 bg-zinc-100 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-zinc-600">Vendor not found.</p>
        <Link to="/browse"><Button variant="outline" size="sm" className="mt-4">← Back to Browse</Button></Link>
      </div>
    );
  }

  const { vendor, services, rating } = data;
  const cat = CATEGORY_MAP[vendor.category];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <Link to="/browse" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back to Browse
      </Link>

      {/* Profile Header */}
      <div className="bg-white border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
            {cat?.icon || vendor.name?.[0]?.toUpperCase()}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                  {vendor.businessName || vendor.name}
                </h1>
                {vendor.businessName && (
                  <p className="text-sm text-zinc-500">by {vendor.name}</p>
                )}
              </div>
              {cat && (
                <Badge variant="available" className="shrink-0">
                  {cat.icon} {cat.label}
                </Badge>
              )}
            </div>

            {vendor.businessDescription && (
              <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{vendor.businessDescription}</p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-500">
              {(vendor.city || vendor.area) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[vendor.area, vendor.city, vendor.pinCode].filter(Boolean).join(', ')}
                </span>
              )}
              {vendor.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {vendor.phone}
                </span>
              )}
              {vendor.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {vendor.email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Member since {formatDate(vendor.createdAt)}
              </span>
            </div>

            {/* Rating summary */}
            {rating.total > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <StarRating rating={rating.average} size="sm" />
                <span className="text-sm font-bold text-zinc-900">{rating.average}</span>
                <span className="text-xs text-zinc-500">({rating.total} review{rating.total !== 1 ? 's' : ''})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 font-medium">Services</p>
          <p className="text-2xl font-bold text-zinc-900 font-mono mt-1">{services.length}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 font-medium">Avg Rating</p>
          <p className="text-2xl font-bold text-zinc-900 font-mono mt-1">
            {rating.average > 0 ? rating.average : '—'}
          </p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500 font-medium">Reviews</p>
          <p className="text-2xl font-bold text-zinc-900 font-mono mt-1">{rating.total}</p>
        </div>
      </div>

      {/* Services List */}
      <div className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-bold text-zinc-900 text-base mb-3">Services Offered</h2>
        {services.length === 0 ? (
          <p className="text-xs text-zinc-500">This vendor hasn't listed any services yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {services.map(s => (
              <div key={s._id} className="p-4 rounded-lg border border-border hover:border-zinc-300 hover:shadow-xs transition-all">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-zinc-900 text-sm">{s.name}</h3>
                  <span className="font-mono font-bold text-blue-600 text-sm">₹{s.price}</span>
                </div>
                {s.description && (
                  <p className="text-xs text-zinc-500 leading-relaxed">{s.description}</p>
                )}
                {s.category && CATEGORY_MAP[s.category] && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full border border-zinc-200">
                    {CATEGORY_MAP[s.category].icon} {CATEGORY_MAP[s.category].label}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="pt-4 mt-4 border-t border-border text-center">
          <Link to={`/browse?vendorId=${vendor._id}`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Browse Available Slots →
            </Button>
          </Link>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-bold text-zinc-900 text-base mb-4">Customer Reviews</h2>

        {ratingSummary && ratingSummary.totalReviews > 0 && (
          <div className="grid sm:grid-cols-2 gap-6 mb-6 pb-6 border-b border-border">
            <div className="flex flex-col items-center justify-center">
              <p className="text-4xl font-bold text-zinc-900 font-mono">{ratingSummary.averageRating}</p>
              <StarRating rating={ratingSummary.averageRating} />
              <p className="text-xs text-zinc-500 mt-1">{ratingSummary.totalReviews} review{ratingSummary.totalReviews !== 1 ? 's' : ''}</p>
            </div>
            <RatingBreakdown breakdown={ratingSummary.breakdown} total={ratingSummary.totalReviews} />
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-8">No reviews yet. Be the first to book and review!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r._id} className="pb-4 border-b border-border last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 text-xs font-bold">
                      {r.customerId?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="font-medium text-zinc-900 text-sm">{r.customerId?.name || 'Customer'}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">{formatDate(r.createdAt)}</span>
                </div>
                <div className="ml-9">
                  <StarRating rating={r.rating} size="sm" />
                  {r.serviceId?.name && (
                    <span className="text-[10px] text-zinc-500 ml-2">for {r.serviceId.name}</span>
                  )}
                  {r.comment && (
                    <p className="text-sm text-zinc-700 mt-1.5 leading-relaxed">{r.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalReviewPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4 mt-4 border-t border-border">
            <Button
              variant="outline"
              size="xs"
              disabled={reviewPage <= 1}
              onClick={() => loadReviewPage(reviewPage - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-zinc-600">Page {reviewPage} of {totalReviewPages}</span>
            <Button
              variant="outline"
              size="xs"
              disabled={reviewPage >= totalReviewPages}
              onClick={() => loadReviewPage(reviewPage + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
