import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getServices, getAvailableSlots, bookSlot,
  createPaymentOrder, verifyPayment, cancelPaymentOrder
} from '../lib/api';
import { loadRazorpayScript } from '../lib/razorpay';
import RazorpayModal from './RazorpayModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Badge } from './ui/badge';
import { Loader2, Search, MapPin, X, ArrowUpRight } from 'lucide-react';

const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'plumbing', label: '🔧 Plumbing' },
  { id: 'salon', label: '💇 Salon & Grooming' },
  { id: 'cleaning', label: '🧹 Cleaning' },
  { id: 'electrician', label: '⚡ Electrician' },
  { id: 'tutor', label: '📚 Tutor' },
  { id: 'appliance-repair', label: '🔨 Appliances' },
  { id: 'painting', label: '🎨 Painting' },
  { id: 'carpentry', label: '🪵 Carpentry' },
];

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SlotSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-3 animate-pulse">
      <div className="h-5 w-32 rounded bg-zinc-100" />
      <div className="h-3 w-20 rounded bg-zinc-100" />
      <div className="h-4 w-40 rounded bg-zinc-100 pt-2" />
      <div className="pt-4 border-t border-border flex justify-between items-center">
        <div className="h-6 w-16 rounded bg-zinc-100" />
        <div className="h-8 w-20 rounded bg-zinc-100" />
      </div>
    </div>
  );
}

// ── Slot Card ─────────────────────────────────────────────────────────────────
function SlotCard({ slot, onBook, booking, verifying }) {
  const duration = Math.round((new Date(slot.endTime) - new Date(slot.startTime)) / 60000);
  const price    = slot.serviceId?.price !== undefined ? slot.serviceId.price : 500;
  const isBusy   = booking === slot._id || verifying === slot._id;

  const vendor = slot.vendorId;
  const vendorId = vendor?._id || vendor;
  const vendorDisplayName = vendor?.businessName || vendor?.name || 'Verified Vendor';
  const location = [vendor?.area, vendor?.city].filter(Boolean).join(', ');

  return (
    <div className="bg-white border border-border rounded-xl p-5 hover:border-zinc-300 hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        {/* Top: Service name + Category badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-zinc-900 text-base leading-snug">
            {slot.serviceId?.name || 'Local Service'}
          </h3>
          {slot.serviceId?.category && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 capitalize flex-shrink-0">
              {slot.serviceId.category}
            </span>
          )}
        </div>

        {/* Vendor Link & Location */}
        <div className="space-y-1 mb-4">
          {vendorId ? (
            <Link
              to={`/vendor/${vendorId}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold group"
            >
              <span>{vendorDisplayName}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          ) : (
            <p className="text-xs text-zinc-500 font-medium">{vendorDisplayName}</p>
          )}

          {location && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <MapPin className="w-3 h-3 text-zinc-400" />
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* Date + time & Duration */}
        <div className="space-y-1 mb-4 bg-zinc-50 rounded-lg p-2.5 border border-border/60">
          <div className="text-xs text-zinc-800 font-semibold">
            {formatDate(slot.startTime)}
          </div>
          <div className="text-[11px] text-zinc-500">
            {duration} min duration
          </div>
        </div>
      </div>

      {/* Bottom row: price (left, monospace) and Book button (right) */}
      <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Price</span>
          <span className="font-mono font-bold text-lg text-zinc-900">
            ₹{price}
          </span>
        </div>
        <Button
          onClick={() => onBook(slot)}
          disabled={isBusy}
          id={`book-slot-${slot._id}`}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 h-8 text-xs"
        >
          {booking === slot._id ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Reserving…</>
          ) : verifying === slot._id ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Verifying…</>
          ) : (
            'Book slot'
          )}
        </Button>
      </div>
    </div>
  );
}

export default function Browse() {
  const { user, token } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [services, setServices]         = useState([]);
  const [slots, setSlots]               = useState([]);
  const [selVendor, setSelVendor]       = useState('');
  const [selService, setSelService]     = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [selCategory, setSelCategory]   = useState(searchParams.get('category') || '');

  const [booking, setBooking]           = useState(null);
  const [verifying, setVerifying]       = useState(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots]       = useState(false);

  const [simulatedCheckout, setSimulatedCheckout] = useState(null);
  const [simulatedVerifying, setSimulatedVerifying] = useState(false);

  // Sync category param if URL changes
  useEffect(() => {
    const cat = searchParams.get('category') || '';
    setSelCategory(cat);
  }, [searchParams]);

  // Load services and slots on mount and when filter criteria change
  useEffect(() => {
    setLoadingServices(true);
    getServices({ category: selCategory || undefined })
      .then(setServices)
      .catch(e => toastError(e.message))
      .finally(() => setLoadingServices(false));
  }, [selCategory]);

  // Reload slots
  useEffect(() => {
    setLoadingSlots(true);
    getAvailableSlots({
      vendorId: selVendor || undefined,
      serviceId: selService || undefined
    })
      .then(setSlots)
      .catch(e => toastError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [selVendor, selService]);

  // Unique vendors from services
  const vendors = useMemo(() => {
    return [...new Map(
      services.filter(s => s.vendorId).map(s => {
        const id = s.vendorId._id || s.vendorId;
        return [id, s.vendorId];
      })
    ).values()];
  }, [services]);

  // Services filtered by selected vendor
  const filteredServices = useMemo(() => {
    return selVendor
      ? services.filter(s => (s.vendorId?._id ?? s.vendorId) === selVendor)
      : services;
  }, [services, selVendor]);

  // Client-side filtering on slots for category and search text
  const visibleSlots = useMemo(() => {
    return slots.filter(slot => {
      // Category filter
      if (selCategory) {
        const slotCat = slot.serviceId?.category || slot.vendorId?.category;
        if (slotCat !== selCategory) return false;
      }
      // Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sName = (slot.serviceId?.name || '').toLowerCase();
        const sDesc = (slot.serviceId?.description || '').toLowerCase();
        const vName = (slot.vendorId?.name || '').toLowerCase();
        const vBiz  = (slot.vendorId?.businessName || '').toLowerCase();
        const vCity = (slot.vendorId?.city || '').toLowerCase();
        const vArea = (slot.vendorId?.area || '').toLowerCase();
        const matches = sName.includes(q) || sDesc.includes(q) || vName.includes(q) || vBiz.includes(q) || vCity.includes(q) || vArea.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [slots, selCategory, searchQuery]);

  const handleCategoryChange = (catId) => {
    setSelCategory(catId);
    if (catId) {
      setSearchParams({ category: catId });
    } else {
      setSearchParams({});
    }
  };

  const handleSimulatedSuccess = async (response) => {
    if (!simulatedCheckout) return;
    setSimulatedVerifying(true);
    try {
      const verifyResult = await verifyPayment(token, {
        bookingId: simulatedCheckout.booking._id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
      if (verifyResult.success && verifyResult.booking?.paymentStatus === 'paid') {
        setSlots(prev => prev.filter(s => s._id !== simulatedCheckout.slotId));
        toastSuccess(`Booking confirmed for ${verifyResult.booking.serviceId?.name || 'service'}! Check "My Bookings".`);
        setSimulatedCheckout(null);
      } else {
        toastError('Payment verification was not confirmed by the server.');
      }
    } catch (err) {
      toastError(`Payment verification failed: ${err.message}`);
    } finally {
      setSimulatedVerifying(false);
    }
  };

  const handleSimulatedCancel = async () => {
    if (!simulatedCheckout) return;
    try {
      await cancelPaymentOrder(token, simulatedCheckout.booking._id);
    } catch (_) {}
    toastError('Payment cancelled. Slot hold released.');
    setSimulatedCheckout(null);
  };

  const handleBook = async (slot) => {
    const slotId = slot._id;
    if (!token) { toastError('Please log in as a customer to book a slot.'); return; }
    if (user?.role === 'vendor') { toastError('Vendors cannot book slots. Please use a customer account.'); return; }

    setBooking(slotId);
    try {
      const pendingBooking = await bookSlot(token, slotId);
      const orderData      = await createPaymentOrder(token, pendingBooking._id);

      if (orderData.isSimulated || !import.meta.env.VITE_RAZORPAY_KEY_ID?.startsWith('rzp_live')) {
        setSimulatedCheckout({
          booking: pendingBooking,
          orderData,
          slotId
        });
        setBooking(null);
        return;
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout SDK failed to load.');
      }

      const options = {
        key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'BookEase',
        description: `Booking for ${pendingBooking.serviceId?.name || 'Service'}`,
        order_id: orderData.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#2563EB' },
        handler: async (response) => {
          setVerifying(slotId);
          try {
            const verifyResult = await verifyPayment(token, {
              bookingId: pendingBooking._id,
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature
            });
            if (verifyResult.success && verifyResult.booking?.paymentStatus === 'paid') {
              setSlots(prev => prev.filter(s => s._id !== slotId));
              toastSuccess(`Booking confirmed for ${verifyResult.booking.serviceId?.name || 'service'}! Check "My Bookings".`);
            } else {
              toastError('Payment verification was not confirmed by the server.');
            }
          } catch (verifyErr) {
            toastError(`Payment verification failed: ${verifyErr.message}`);
          } finally {
            setVerifying(null);
            setBooking(null);
          }
        },
        modal: {
          ondismiss: async () => {
            try { await cancelPaymentOrder(token, pendingBooking._id); } catch (_) {}
            toastError('Payment cancelled. Slot hold released.');
            setBooking(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (failedResponse) => {
        try { await cancelPaymentOrder(token, pendingBooking._id); } catch (_) {}
        toastError(`Payment failed: ${failedResponse.error?.description || 'Transaction unsuccessful'}. Slot released.`);
        setBooking(null);
      });
      rzp.open();
    } catch (err) {
      toastError(err.message);
      setBooking(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
            Browse services
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Filter by category, vendor, or keyword to see live availability.</p>
        </div>
        {!token && (
          <p className="text-xs text-zinc-600">
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Log in</Link> to book a slot.
          </p>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map(c => {
          const isActive = selCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCategoryChange(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-zinc-600 border-border hover:border-zinc-300 hover:text-zinc-900'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Search & Dropdown Filters */}
      <div className="bg-white border border-border rounded-xl p-4 sm:p-5 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by service name, vendor, area or city…"
            className="pl-9 pr-8 h-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Vendor & Service dropdowns */}
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Vendor</label>
            {loadingServices ? (
              <div className="h-9 rounded-lg bg-zinc-100 animate-pulse" />
            ) : (
              <Select
                value={selVendor}
                onChange={e => { setSelVendor(e.target.value); setSelService(''); }}
                className="h-9 text-xs"
              >
                <option value="">All vendors</option>
                {vendors.map(v => (
                  <option key={v._id} value={v._id}>
                    {v.businessName ? `${v.businessName} (${v.name})` : v.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Specific Service</label>
            {loadingServices ? (
              <div className="h-9 rounded-lg bg-zinc-100 animate-pulse" />
            ) : (
              <Select
                value={selService}
                onChange={e => setSelService(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="">All services</option>
                {filteredServices.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} (₹{s.price})
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Slots Section */}
      {loadingSlots ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SlotSkeleton key={i} />)}
        </div>
      ) : visibleSlots.length === 0 ? (
        <div className="bg-white border border-border rounded-xl py-14 text-center">
          <p className="text-zinc-700 font-medium text-sm">No available slots found matching your filters.</p>
          <p className="text-xs text-zinc-500 mt-1 mb-4">Try clearing the search query or selecting another category.</p>
          {(selCategory || searchQuery || selVendor || selService) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelCategory('');
                setSearchQuery('');
                setSelVendor('');
                setSelService('');
                setSearchParams({});
              }}
              className="text-xs"
            >
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
            <span>
              Showing <strong className="text-zinc-900 font-semibold">{visibleSlots.length}</strong> available slot{visibleSlots.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSlots.map(slot => (
              <SlotCard
                key={slot._id}
                slot={slot}
                onBook={handleBook}
                booking={booking}
                verifying={verifying}
              />
            ))}
          </div>
        </>
      )}

      <RazorpayModal
        isOpen={!!simulatedCheckout}
        orderData={simulatedCheckout?.orderData}
        booking={simulatedCheckout?.booking}
        onSuccess={handleSimulatedSuccess}
        onCancel={handleSimulatedCancel}
        verifying={simulatedVerifying}
      />
    </div>
  );
}
