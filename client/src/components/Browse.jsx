import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getServices, getAvailableSlots, bookSlot, createPaymentOrder, verifyPayment, cancelPaymentOrder } from '../lib/api';
import { loadRazorpayScript } from '../lib/razorpay';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select } from './ui/select';
import {
  CalendarDays, Clock, Store, Loader2, Sparkles, CreditCard, Search
} from 'lucide-react';

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', hour12: true
  });
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SlotSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3 animate-pulse">
        <div className="flex justify-between">
          <div className="h-5 w-20 rounded-full bg-white/5" />
          <div className="h-5 w-12 rounded bg-white/5" />
        </div>
        <div className="h-3 w-36 rounded bg-white/5" />
        <div className="h-3 w-28 rounded bg-white/5" />
        <div className="h-9 w-full rounded-lg bg-white/5" />
      </CardContent>
    </Card>
  );
}

function SlotCard({ slot, onBook, booking, verifying }) {
  const duration = Math.round((new Date(slot.endTime) - new Date(slot.startTime)) / 60000);
  const price    = slot.serviceId?.price !== undefined ? slot.serviceId.price : 500;
  const isBusy   = booking === slot._id || verifying === slot._id;

  return (
    <Card className="group transition-all duration-200 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Badge variant="available">available</Badge>
          <div className="text-right">
            <span className="text-base font-bold text-violet-400">₹{price}</span>
            <span className="block text-xs text-zinc-600">{duration} min</span>
          </div>
        </div>
        {/* Service name */}
        {slot.serviceId?.name && (
          <p className="text-xs font-medium text-zinc-300 mb-2 truncate">{slot.serviceId.name}</p>
        )}
        <div className="space-y-1 text-sm text-zinc-400 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
            <span className="text-xs">{formatDate(slot.startTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 pl-5 text-zinc-600">
            <span className="text-xs">→ {formatDate(slot.endTime)}</span>
          </div>
        </div>
        <Button
          onClick={() => onBook(slot)}
          disabled={isBusy}
          id={`book-slot-${slot._id}`}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white border-0 text-sm h-9 flex items-center justify-center gap-1.5"
        >
          {booking === slot._id ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reserving…</>
          ) : verifying === slot._id ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</>
          ) : (
            <><CreditCard className="w-3.5 h-3.5" /> Pay ₹{price} &amp; Book</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Browse() {
  const { user, token } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [services, setServices]     = useState([]);
  const [slots, setSlots]           = useState([]);
  const [selVendor, setSelVendor]   = useState('');
  const [selService, setSelService] = useState('');
  const [booking, setBooking]       = useState(null);
  const [verifying, setVerifying]   = useState(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots]       = useState(false);

  // Load all services (public)
  useEffect(() => {
    getServices()
      .then(setServices)
      .catch(e => toastError(e.message))
      .finally(() => setLoadingServices(false));
  }, []);

  // Reload slots when filters change
  useEffect(() => {
    if (!selService && !selVendor) { setSlots([]); return; }
    setLoadingSlots(true);
    getAvailableSlots({ vendorId: selVendor || undefined, serviceId: selService || undefined })
      .then(setSlots)
      .catch(e => toastError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [selVendor, selService]);

  // Unique vendors from services
  const vendors = [...new Map(
    services.filter(s => s.vendorId).map(s => [s.vendorId._id, s.vendorId])
  ).values()];

  // Services filtered by selected vendor
  const filteredServices = selVendor
    ? services.filter(s => (s.vendorId?._id ?? s.vendorId) === selVendor)
    : services;

  const handleBook = async (slot) => {
    const slotId = slot._id;
    if (!token) { toastError('Please log in as a customer to book a slot.'); return; }
    if (user?.role === 'vendor') { toastError('Vendors cannot book slots. Please use a customer account.'); return; }

    setBooking(slotId);
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout SDK failed to load. Check your internet connection.');
      }

      const pendingBooking = await bookSlot(token, slotId);
      const orderData      = await createPaymentOrder(token, pendingBooking._id);

      const options = {
        key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'BookEase',
        description: `Booking for ${pendingBooking.serviceId?.name || 'Service'}`,
        order_id: orderData.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#7c3aed' },
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
              toastSuccess(`🎉 Booking confirmed for ${verifyResult.booking.serviceId?.name || 'service'}! Check "My Bookings".`);
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
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <Search className="w-7 h-7 text-violet-400" />
          Browse &amp; Book
        </h1>
        <p className="text-zinc-400 mt-1">Find available slots from local service providers.</p>
        {!token && (
          <p className="text-xs text-zinc-600 mt-2">
            <Link to="/login" className="text-violet-400 hover:text-violet-300 underline underline-offset-4">Log in</Link> to book a slot.
          </p>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-zinc-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" /> Filter services
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> Vendor
              </label>
              {loadingServices ? (
                <div className="h-10 rounded-lg bg-white/5 animate-pulse" />
              ) : (
                <Select
                  value={selVendor}
                  onChange={e => { setSelVendor(e.target.value); setSelService(''); }}
                >
                  <option value="">All vendors</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Service
              </label>
              {loadingServices ? (
                <div className="h-10 rounded-lg bg-white/5 animate-pulse" />
              ) : (
                <Select
                  value={selService}
                  onChange={e => setSelService(e.target.value)}
                >
                  <option value="">All services</option>
                  {filteredServices.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slots grid */}
      {!selService && !selVendor ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-10 h-10 text-violet-400/50" />
          </div>
          <p className="text-zinc-500 font-medium">Select a vendor or service to see available slots.</p>
          <p className="text-xs text-zinc-700 mt-1">Slots update in real-time — no double-bookings possible.</p>
        </div>
      ) : loadingSlots ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SlotSkeleton key={i} />)}
        </div>
      ) : slots.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500 font-medium">No available slots at the moment.</p>
            <p className="text-xs text-zinc-700 mt-1">Try a different vendor or check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            <span className="text-violet-400 font-semibold">{slots.length}</span> slot{slots.length !== 1 ? 's' : ''} available
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(slot => (
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
    </div>
  );
}
