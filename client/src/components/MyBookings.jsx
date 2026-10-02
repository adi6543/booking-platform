import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { getMyBookings, cancelBooking, createPaymentOrder, verifyPayment, cancelPaymentOrder } from '../lib/api';
import { loadRazorpayScript } from '../lib/razorpay';
import RazorpayModal from './RazorpayModal';
import { Badge } from './ui/badge';
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

function formatTimeOnly(d) {
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function MyBookings() {
  const { user, token } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [cancelling, setCancelling] = useState(null);
  const [paying, setPaying]         = useState(null);
  const [simulatedCheckout, setSimulatedCheckout] = useState(null);
  const [simulatedVerifying, setSimulatedVerifying] = useState(false);

  const fetchBookings = () => {
    if (!token) return;
    setLoading(true);
    getMyBookings(token)
      .then(setBookings)
      .catch(e => toastError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [token]);

  const handleCancel = async (id) => {
    const ok = await confirm('Cancel this booking? If payment was made, please contact support for a refund.');
    if (!ok) return;
    setCancelling(id);
    try {
      const { booking } = await cancelBooking(token, id);
      setBookings(prev => prev.map(b => b._id === id ? booking : b));
      toastSuccess('Booking cancelled successfully.');
    } catch (err) {
      toastError(err.message);
    } finally {
      setCancelling(null);
    }
  };

  const handleSimulatedSuccess = async (response) => {
    if (!simulatedCheckout) return;
    setSimulatedVerifying(true);
    try {
      const verifyResult = await verifyPayment(token, {
        bookingId: simulatedCheckout.bookingId,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });
      if (verifyResult.success && verifyResult.booking?.paymentStatus === 'paid') {
        setBookings(prev => prev.map(item => item._id === simulatedCheckout.bookingId ? verifyResult.booking : item));
        toastSuccess('Payment verified! Your booking is confirmed.');
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
    try { await cancelPaymentOrder(token, simulatedCheckout.bookingId); } catch (_) {}
    toastError('Payment cancelled.');
    setSimulatedCheckout(null);
  };

  const handlePayNow = async (b) => {
    setPaying(b._id);
    try {
      const orderData = await createPaymentOrder(token, b._id);

      // In test mode or when simulated order is returned, open sandbox modal
      if (orderData.isSimulated || !import.meta.env.VITE_RAZORPAY_KEY_ID?.startsWith('rzp_live')) {
        setSimulatedCheckout({
          booking: b,
          orderData,
          bookingId: b._id
        });
        setPaying(null);
        return;
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load.');
      }

      const options = {
        key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'BookEase',
        description: `Payment for ${b.serviceId?.name || 'Service'}`,
        order_id: orderData.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#2563EB' },
        handler: async (response) => {
          try {
            const verifyResult = await verifyPayment(token, {
              bookingId: b._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            if (verifyResult.success && verifyResult.booking?.paymentStatus === 'paid') {
              setBookings(prev => prev.map(item => item._id === b._id ? verifyResult.booking : item));
              toastSuccess('Payment verified! Your booking is confirmed.');
            } else {
              toastError('Payment verification was not confirmed by the server.');
            }
          } catch (verErr) {
            toastError(`Verification error: ${verErr.message}`);
          } finally {
            setPaying(null);
          }
        },
        modal: {
          ondismiss: () => {
            toastError('Payment checkout cancelled.');
            setPaying(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toastError(err.message);
      setPaying(null);
    }
  };

  const filtered = filter === 'all'
    ? bookings
    : filter === 'confirmed'
    ? bookings.filter(b => b.status === 'confirmed' && b.paymentStatus === 'paid')
    : filter === 'pending'
    ? bookings.filter(b => b.paymentStatus === 'pending' && b.status === 'pending')
    : bookings.filter(b => b.status === 'cancelled' || b.status === 'failed' || b.paymentStatus === 'failed');

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed' && b.paymentStatus === 'paid').length,
    pending:   bookings.filter(b => b.paymentStatus === 'pending' && b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled' || b.status === 'failed' || b.paymentStatus === 'failed').length,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">My Bookings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Track your upcoming appointments, service details, and payment receipts.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: stats.total,     color: 'text-zinc-900' },
          { label: 'Confirmed (Paid)', value: stats.confirmed, color: 'text-emerald-700' },
          { label: 'Pending Payment', value: stats.pending,   color: 'text-amber-700' },
          { label: 'Cancelled',      value: stats.cancelled, color: 'text-zinc-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border rounded-xl p-4">
            <p className="text-xs text-zinc-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs text-zinc-500">
          Showing <strong className="text-zinc-900 font-semibold">{filtered.length}</strong> appointment{filtered.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Show:</span>
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-48 h-8 text-xs">
            <option value="all">All bookings</option>
            <option value="confirmed">Confirmed (Paid)</option>
            <option value="pending">Pending Payment</option>
            <option value="cancelled">Cancelled / Failed</option>
          </Select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-xs text-zinc-400">
          Loading your bookings…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl py-14 text-center">
          <p className="text-zinc-700 font-medium text-sm mb-3">No bookings found for this filter.</p>
          <Link to="/browse">
            <Button size="sm" variant="outline">
              Browse available services →
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const isPaid      = b.paymentStatus === 'paid';
            const isPending   = b.paymentStatus === 'pending' && b.status === 'pending';
            const isCancelled = b.status === 'cancelled' || b.status === 'failed';
            const price       = b.amount ? b.amount / 100 : (b.serviceId?.price || 500);

            return (
              <div
                key={b._id}
                className={`bg-white border border-border rounded-xl p-5 transition-all ${
                  isCancelled ? 'opacity-60 bg-zinc-50' : 'hover:border-zinc-300 hover:shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Service & Provider */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-zinc-900 text-base">
                        {b.serviceId?.name ?? '—'}
                      </h3>
                      <Badge variant={isPaid ? 'paid' : isPending ? 'pending' : 'cancelled'}>
                        {isPaid ? 'Paid' : isPending ? 'Pending' : b.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Provided by <strong className="text-zinc-700 font-medium">{b.vendorId?.name ?? 'Verified Vendor'}</strong>
                    </p>
                  </div>

                  {/* Middle: Appointment Date & Time */}
                  <div className="text-left sm:text-right text-xs">
                    {b.slotId ? (
                      <>
                        <div className="font-medium text-zinc-900">{formatDate(b.slotId.startTime)}</div>
                        <div className="text-zinc-500 text-[11px]">to {formatTimeOnly(b.slotId.endTime)}</div>
                      </>
                    ) : <span className="text-zinc-400">—</span>}
                  </div>

                  {/* Right: Price & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                    <div className="font-mono font-semibold text-lg text-zinc-900 sm:text-right">
                      ₹{price}
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <Button
                          size="sm"
                          id={`pay-btn-${b._id}`}
                          disabled={paying === b._id}
                          onClick={() => handlePayNow(b)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                        >
                          {paying === b._id ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Processing…</>
                          ) : (
                            'Pay Now'
                          )}
                        </Button>
                      )}
                      {!isCancelled && (
                        <Button
                          variant="outline"
                          size="sm"
                          id={`cancel-btn-${b._id}`}
                          disabled={cancelling === b._id}
                          onClick={() => handleCancel(b._id)}
                          className="text-zinc-600 hover:text-red-600 text-xs h-8 px-3"
                        >
                          {cancelling === b._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Cancel'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
