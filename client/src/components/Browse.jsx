import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getServices, getAvailableSlots, bookSlot, createPaymentOrder, verifyPayment, cancelPaymentOrder } from '../lib/api';
import { loadRazorpayScript } from '../lib/razorpay';
import RazorpayModal from './RazorpayModal';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { Loader2 } from 'lucide-react';

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

// ── Slot Card (Strictly adhering to Design Plan Anatomy) ───────────────────────
function SlotCard({ slot, vendorName, onBook, booking, verifying }) {
  const duration = Math.round((new Date(slot.endTime) - new Date(slot.startTime)) / 60000);
  const price    = slot.serviceId?.price !== undefined ? slot.serviceId.price : 500;
  const isBusy   = booking === slot._id || verifying === slot._id;

  return (
    <div className="bg-white border border-border rounded-xl p-5 hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between">
      <div>
        {/* 1. Service name (bold) + vendor name (muted, smaller) — stacked */}
        <div className="mb-3">
          <h3 className="font-bold text-zinc-900 text-base leading-snug">
            {slot.serviceId?.name || 'Local Service'}
          </h3>
          {vendorName && (
            <p className="text-xs text-zinc-500 font-medium mt-0.5">{vendorName}</p>
          )}
        </div>

        {/* 2. Date + time & 3. Duration */}
        <div className="space-y-1 mb-5">
          <div className="text-xs text-zinc-800 font-medium">
            {formatDate(slot.startTime)}
          </div>
          <div className="text-xs text-zinc-500">
            {duration} min duration
          </div>
        </div>
      </div>

      {/* 4. Bottom row: price (left, monospace) and Book button (right) */}
      <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
        <div className="font-mono font-semibold text-lg text-zinc-900">
          ₹{price}
        </div>
        <Button
          onClick={() => onBook(slot)}
          disabled={isBusy}
          id={`book-slot-${slot._id}`}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 h-8 text-xs"
        >
          {booking === slot._id ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reserving…</>
          ) : verifying === slot._id ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</>
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

  const [services, setServices]     = useState([]);
  const [slots, setSlots]           = useState([]);
  const [selVendor, setSelVendor]   = useState('');
  const [selService, setSelService] = useState('');
  const [booking, setBooking]       = useState(null);
  const [verifying, setVerifying]   = useState(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots]       = useState(false);

  const [simulatedCheckout, setSimulatedCheckout] = useState(null);
  const [simulatedVerifying, setSimulatedVerifying] = useState(false);

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

      // In test mode or when simulated order is returned, open realistic sandbox modal
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
          <p className="text-sm text-zinc-500 mt-0.5">Filter by vendor or service to see live availability.</p>
        </div>
        {!token && (
          <p className="text-xs text-zinc-600">
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Log in</Link> to book a slot.
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-border rounded-xl p-4 sm:p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Vendor</label>
            {loadingServices ? (
              <div className="h-9 rounded-lg bg-zinc-100 animate-pulse" />
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
            <label className="text-xs font-semibold text-zinc-700">Service</label>
            {loadingServices ? (
              <div className="h-9 rounded-lg bg-zinc-100 animate-pulse" />
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
      </div>

      {/* Slots Section */}
      {!selService && !selVendor ? (
        <div className="text-center py-16 bg-white border border-border rounded-xl">
          <p className="text-zinc-700 font-medium text-sm">Select a vendor or service above to view available slots.</p>
          <p className="text-xs text-zinc-500 mt-1">Real-time availability is synchronized directly with vendor calendars.</p>
        </div>
      ) : loadingSlots ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SlotSkeleton key={i} />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-white border border-border rounded-xl py-14 text-center">
          <p className="text-zinc-700 font-medium text-sm">No available slots found for this selection.</p>
          <p className="text-xs text-zinc-500 mt-1">Please try choosing another service or check back shortly.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
            <span>
              Showing <strong className="text-zinc-900 font-semibold">{slots.length}</strong> available slot{slots.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(slot => {
              const vendor = vendors.find(v => v._id === (slot.vendorId?._id || slot.vendorId)) || slot.vendorId;
              const vendorName = vendor?.name || '';
              return (
                <SlotCard
                  key={slot._id}
                  slot={slot}
                  vendorName={vendorName}
                  onBook={handleBook}
                  booking={booking}
                  verifying={verifying}
                />
              );
            })}
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
