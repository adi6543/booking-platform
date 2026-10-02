import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { getVendorBookings, cancelBooking } from '../lib/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select } from './ui/select';
import { Loader2, XCircle } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Incoming Bookings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Track reservations, customer appointments, and payment settlements.</p>
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

      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs text-zinc-500">
          Showing <strong className="text-zinc-900 font-semibold">{filtered.length}</strong> booking{filtered.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Filter status:</span>
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-48 h-8 text-xs">
            <option value="all">All bookings</option>
            <option value="confirmed">Confirmed (Paid)</option>
            <option value="pending">Pending Payment</option>
            <option value="cancelled">Cancelled / Failed</option>
          </Select>
        </div>
      </div>

      {/* List / Table */}
      {loading ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-xs text-zinc-400">
          Loading incoming bookings…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl py-14 text-center">
          <p className="text-zinc-700 font-medium text-sm">No bookings found matching this filter.</p>
          <p className="text-xs text-zinc-500 mt-1">When customers book your slots, they will appear here in real-time.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-border text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Service &amp; Customer</th>
                  <th className="py-2.5 px-4">Slot Time</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(b => {
                  const isPaid    = b.paymentStatus === 'paid';
                  const isPending = b.paymentStatus === 'pending' && b.status === 'pending';
                  const price     = b.amount ? b.amount / 100 : (b.serviceId?.price || 500);

                  return (
                    <tr key={b._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900">{b.serviceId?.name ?? '—'}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {b.customerId?.name ?? 'Customer'} · <span className="font-mono">{b.customerId?.email ?? '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-700">
                        {b.slotId ? (
                          <>
                            <div>{formatDate(b.slotId.startTime)}</div>
                            <div className="text-zinc-500 text-[11px]">to {formatTimeOnly(b.slotId.endTime)}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-900">
                        ₹{price}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isPaid ? 'paid' : isPending ? 'pending' : 'cancelled'}>
                          {isPaid ? 'Paid' : isPending ? 'Pending' : b.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.status === 'confirmed' && (
                          <Button
                            variant="ghost"
                            size="xs"
                            id={`vendor-cancel-${b._id}`}
                            disabled={cancelling === b._id}
                            onClick={() => handleCancel(b._id)}
                            className="text-zinc-500 hover:text-red-600 hover:bg-red-50"
                          >
                            {cancelling === b._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            <span className="ml-1">Cancel</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
