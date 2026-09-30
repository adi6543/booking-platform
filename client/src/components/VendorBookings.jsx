import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { getVendorBookings, cancelBooking } from '../lib/api';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { LayoutDashboard, Clock, User, Loader2, XCircle } from 'lucide-react';

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', hour12: true
  });
}

function BookingSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className="w-1.5 bg-white/5 flex-shrink-0" />
          <div className="flex-1 p-4 space-y-2 animate-pulse">
            <div className="h-4 w-48 rounded bg-white/5" />
            <div className="h-3 w-32 rounded bg-white/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorBookings() {
  const { token } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!token) return;
    getVendorBookings(token)
      .then(setBookings)
      .catch(e => toastError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCancel = async (id) => {
    const ok = await confirm('Cancel this booking? The slot will be freed for other customers.');
    if (!ok) return;
    setCancelling(id);
    try {
      const { booking } = await cancelBooking(token, id);
      setBookings(prev => prev.map(b => b._id === id ? booking : b));
      toastSuccess('Booking cancelled. Slot freed.');
    } catch (err) {
      toastError(err.message);
    } finally {
      setCancelling(null);
    }
  };

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed' && b.paymentStatus === 'paid').length,
    pending:   bookings.filter(b => b.paymentStatus === 'pending' && b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled' || b.status === 'failed' || b.paymentStatus === 'failed').length,
  };

  const filtered = filter === 'all'
    ? bookings
    : filter === 'confirmed'
    ? bookings.filter(b => b.status === 'confirmed' && b.paymentStatus === 'paid')
    : filter === 'pending'
    ? bookings.filter(b => b.paymentStatus === 'pending' && b.status === 'pending')
    : bookings.filter(b => b.status === 'cancelled' || b.status === 'failed' || b.paymentStatus === 'failed');

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-7 h-7 text-violet-400" />
          Incoming Bookings
        </h1>
        <p className="text-zinc-400 mt-1">All bookings made for your services, with real-time payment status.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-zinc-300',    bg: 'bg-white/[0.03]' },
          { label: 'Confirmed', value: stats.confirmed, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
          { label: 'Pending',   value: stats.pending,   color: 'text-amber-400',   bg: 'bg-amber-500/5' },
          { label: 'Cancelled', value: stats.cancelled, color: 'text-zinc-500',    bg: 'bg-white/[0.02]' },
        ].map(s => (
          <Card key={s.label} className={s.bg}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400 flex-shrink-0">Filter:</span>
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
          {[...Array(4)].map((_, i) => <BookingSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500">No bookings found for this filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const isPaid    = b.paymentStatus === 'paid';
            const isPending = b.paymentStatus === 'pending' && b.status === 'pending';
            const price     = b.amount ? b.amount / 100 : (b.serviceId?.price || 500);

            return (
              <Card key={b._id} className="overflow-hidden hover:border-white/15 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Color bar */}
                    <div className={`w-1.5 flex-shrink-0 rounded-l-xl ${
                      isPaid ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-zinc-700'
                    }`} />
                    <div className="flex-1 p-4 flex flex-wrap items-center gap-4">
                      {/* Service + status */}
                      <div className="flex-1 min-w-[180px]">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-zinc-100 truncate">
                            {b.serviceId?.name ?? '—'}
                          </span>
                          <span className="text-sm font-bold text-violet-400">₹{price}</span>
                          <Badge variant={isPaid ? 'paid' : isPending ? 'pending' : 'cancelled'}>
                            {isPaid ? 'Paid' : isPending ? 'Pending Payment' : b.status}
                          </Badge>
                        </div>
                        {/* Customer */}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <User className="w-3 h-3" />
                          <span>{b.customerId?.name ?? '—'}</span>
                          <span>·</span>
                          <span className="truncate max-w-[140px]">{b.customerId?.email ?? '—'}</span>
                        </div>
                      </div>

                      {/* Slot time */}
                      <div className="text-xs text-zinc-500 shrink-0">
                        {b.slotId ? (
                          <>
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3" />
                              {formatDate(b.slotId.startTime)}
                            </div>
                            <div className="text-zinc-600 text-right">→ {formatDate(b.slotId.endTime)}</div>
                          </>
                        ) : <span>—</span>}
                      </div>

                      {/* Cancel */}
                      {b.status === 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          id={`vendor-cancel-${b._id}`}
                          disabled={cancelling === b._id}
                          onClick={() => handleCancel(b._id)}
                          className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0 gap-1.5"
                        >
                          {cancelling === b._id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5" />}
                          Cancel
                        </Button>
                      )}
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
