import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { getMyBookings, cancelBooking, createPaymentOrder, verifyPayment, cancelPaymentOrder } from '../lib/api';
import { loadRazorpayScript } from '../lib/razorpay';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select } from './ui/select';
import {
  BookOpen, Clock, Store, Loader2, XCircle, CreditCard, CalendarDays
} from 'lucide-react';

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', hour12: true
  });
}

// ── Skeleton loader ─────────────────────────────────────────────────────────
function BookingSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className="w-1.5 bg-white/5 flex-shrink-0" />
          <div className="flex-1 p-4 space-y-2 animate-pulse">
            <div className="h-4 w-40 rounded bg-white/5" />
            <div className="h-3 w-24 rounded bg-white/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
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

  const handlePayNow = async (b) => {
    setPaying(b._id);
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const orderData = await createPaymentOrder(token, b._id);

      const options = {
        key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'BookEase',
        description: `Payment for ${b.serviceId?.name || 'Service'}`,
        order_id: orderData.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#7c3aed' },
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
              toastSuccess('🎉 Payment verified! Your booking is confirmed.');
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
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-violet-400" />
          My Bookings
        </h1>
        <p className="text-zinc-400 mt-1">All your service appointments, payments, and confirmations.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',           value: stats.total,     color: 'text-zinc-300',   bg: 'bg-white/[0.03]' },
          { label: 'Confirmed',       value: stats.confirmed, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
          { label: 'Pending',         value: stats.pending,   color: 'text-amber-400',   bg: 'bg-amber-500/5' },
          { label: 'Cancelled',       value: stats.cancelled, color: 'text-zinc-500',    bg: 'bg-white/[0.02]' },
        ].map(s => (
          <Card key={s.label} className={`${s.bg}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400 flex-shrink-0">Show:</span>
        <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-48">
          <option value="all">All bookings</option>
          <option value="confirmed">Confirmed (Paid)</option>
          <option value="pending">Pending Payment</option>
          <option value="cancelled">Cancelled / Failed</option>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <BookingSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500 mb-4">No bookings found for this filter.</p>
            <Link to="/browse">
              <Button variant="outline" size="sm" className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5">
                Browse available services →
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const isPaid      = b.paymentStatus === 'paid';
            const isPending   = b.paymentStatus === 'pending' && b.status === 'pending';
            const isCancelled = b.status === 'cancelled' || b.status === 'failed';
            const price       = b.amount ? b.amount / 100 : (b.serviceId?.price || 500);

            return (
              <Card
                key={b._id}
                className={`overflow-hidden transition-all duration-200 ${isCancelled ? 'opacity-55' : 'hover:border-white/15'}`}
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Status bar */}
                    <div className={`w-1.5 flex-shrink-0 rounded-l-xl ${
                      isPaid ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-zinc-700'
                    }`} />
                    <div className="flex-1 p-4 flex flex-wrap items-center gap-4">
                      {/* Service + vendor */}
                      <div className="flex-1 min-w-[180px]">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-zinc-100 truncate">
                            {b.serviceId?.name ?? '—'}
                          </span>
                          <span className="text-sm font-bold text-violet-400">₹{price}</span>
                          <Badge variant={isPaid ? 'paid' : isPending ? 'pending' : 'cancelled'}>
                            {isPaid ? 'Paid' : isPending ? 'Pending' : b.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Store className="w-3 h-3" />
                          <span>{b.vendorId?.name ?? '—'}</span>
                          <span>·</span>
                          <span className="truncate max-w-[140px]">{b.vendorId?.email ?? '—'}</span>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-xs text-zinc-400 shrink-0">
                        {b.slotId ? (
                          <>
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3 text-violet-400" />
                              {formatDate(b.slotId.startTime)}
                            </div>
                            <div className="text-zinc-600 text-right">→ {formatDate(b.slotId.endTime)}</div>
                          </>
                        ) : <span>—</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending && (
                          <Button
                            size="sm"
                            id={`pay-btn-${b._id}`}
                            disabled={paying === b._id}
                            onClick={() => handlePayNow(b)}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-8 gap-1.5"
                          >
                            {paying === b._id
                              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                              : <><CreditCard className="w-3.5 h-3.5" /> Pay Now</>}
                          </Button>
                        )}
                        {!isCancelled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            id={`cancel-btn-${b._id}`}
                            disabled={cancelling === b._id}
                            onClick={() => handleCancel(b._id)}
                            className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs h-8 gap-1.5"
                          >
                            {cancelling === b._id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <XCircle className="w-3.5 h-3.5" />}
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
