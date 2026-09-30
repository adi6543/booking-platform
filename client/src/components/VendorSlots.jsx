import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import {
  getVendorServices, getVendorSlots, createService, deleteService,
  createSlot, deleteSlot
} from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import {
  Plus, Trash2, CalendarDays, Clock, Loader2, Layers
} from 'lucide-react';

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', hour12: true
  });
}

export default function VendorSlots() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();

  const [services, setServices]     = useState([]);
  const [slots, setSlots]           = useState([]);
  const [selService, setSelService] = useState('');

  // Service creation
  const [newServiceName, setNewServiceName]   = useState('');
  const [newServicePrice, setNewServicePrice] = useState('500');

  // Slot creation
  const [slotForm, setSlotForm] = useState({ serviceId: '', startTime: '', endTime: '' });

  const [loading, setLoading]         = useState(false);
  const [slotLoading, setSlotLoading] = useState(false);

  // Redirect non-vendors
  useEffect(() => {
    if (user && user.role !== 'vendor') navigate('/');
  }, [user, navigate]);

  // Fetch services
  useEffect(() => {
    if (!token) return;
    getVendorServices(token)
      .then(setServices)
      .catch(e => toastError(e.message));
  }, [token]);

  // Fetch slots when service selection changes
  useEffect(() => {
    if (!token) return;
    setSlotLoading(true);
    getVendorSlots(token, selService || undefined)
      .then(setSlots)
      .catch(e => toastError(e.message))
      .finally(() => setSlotLoading(false));
  }, [token, selService]);

  // ── Create service ─────────────────────────────────────────────────────────
  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    setLoading(true);
    try {
      const priceVal = Number(newServicePrice) >= 0 ? Number(newServicePrice) : 500;
      const s = await createService(token, newServiceName.trim(), priceVal);
      setServices(prev => [s, ...prev]);
      setNewServiceName('');
      setNewServicePrice('500');
      toastSuccess(`Service "${s.name}" (₹${priceVal}) created!`);
    } catch (err) { toastError(err.message); }
    finally { setLoading(false); }
  };

  // ── Delete service ─────────────────────────────────────────────────────────
  const handleDeleteService = async (id, name) => {
    const ok = await confirm(`Delete service "${name}"? Any existing slots for this service will remain.`);
    if (!ok) return;
    try {
      await deleteService(token, id);
      setServices(prev => prev.filter(s => s._id !== id));
      if (slotForm.serviceId === id) setSlotForm(f => ({ ...f, serviceId: '' }));
      toastSuccess('Service deleted.');
    } catch (err) { toastError(err.message); }
  };

  // ── Create slot ────────────────────────────────────────────────────────────
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    const { serviceId, startTime, endTime } = slotForm;
    if (!serviceId || !startTime || !endTime) {
      toastError('All fields are required.'); return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      toastError('End time must be after start time.'); return;
    }
    setLoading(true);
    try {
      const slot = await createSlot(token, {
        serviceId,
        startTime: new Date(startTime).toISOString(),
        endTime:   new Date(endTime).toISOString(),
      });
      setSlots(prev => [slot, ...prev]);
      setSlotForm(f => ({ ...f, startTime: '', endTime: '' }));
      toastSuccess('Slot created successfully!');
    } catch (err) { toastError(err.message); }
    finally { setLoading(false); }
  };

  // ── Delete slot ────────────────────────────────────────────────────────────
  const handleDeleteSlot = async (slotId) => {
    const ok = await confirm('Delete this slot? It will no longer be available for booking.');
    if (!ok) return;
    try {
      await deleteSlot(token, slotId);
      setSlots(prev => prev.filter(s => s._id !== slotId));
      toastSuccess('Slot deleted.');
    } catch (err) { toastError(err.message); }
  };

  const filteredSlots = selService
    ? slots.filter(s => (s.serviceId?._id ?? s.serviceId) === selService)
    : slots;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold text-white tracking-tight">Manage Slots</h1>
        <p className="text-zinc-400 mt-1">Create services and availability windows for your customers.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Create Service ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Layers className="w-5 h-5 text-violet-400" />
              Add a Service
            </CardTitle>
            <CardDescription>Create a new service offering (e.g. "Haircut", "Deep Cleaning")</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateService} className="flex gap-2">
              <Input
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                placeholder="Service name..."
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 flex-1"
              />
              <Input
                type="number"
                min="0"
                value={newServicePrice}
                onChange={e => setNewServicePrice(e.target.value)}
                placeholder="₹ Price"
                className="w-24 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
              />
              <Button
                type="submit"
                id="create-service-btn"
                disabled={loading || !newServiceName.trim()}
                className="bg-violet-600 hover:bg-violet-500 text-white border-0 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </form>

            {services.length > 0 && (
              <div className="mt-4 space-y-2">
                {services.map(s => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-200">{s.name}</span>
                      <span className="text-xs text-violet-400 font-semibold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                        ₹{s.price || 500}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteService(s._id, s.name)}
                      className="text-zinc-600 hover:text-rose-400 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {services.length === 0 && (
              <p className="mt-4 text-xs text-zinc-600">No services yet — add one above.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Create Slot ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CalendarDays className="w-5 h-5 text-fuchsia-400" />
              Add a Slot
            </CardTitle>
            <CardDescription>Define an available time window for a service.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSlot} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Service</Label>
                <Select
                  value={slotForm.serviceId}
                  onChange={e => setSlotForm(f => ({ ...f, serviceId: e.target.value }))}
                  disabled={services.length === 0}
                >
                  <option value="">Select a service…</option>
                  {services.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Start Time</Label>
                <Input
                  type="datetime-local"
                  value={slotForm.startTime}
                  onChange={e => setSlotForm(f => ({ ...f, startTime: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">End Time</Label>
                <Input
                  type="datetime-local"
                  value={slotForm.endTime}
                  onChange={e => setSlotForm(f => ({ ...f, endTime: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                />
              </div>
              <Button
                type="submit"
                id="create-slot-btn"
                disabled={loading}
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white border-0 mt-1"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                  : <><Plus className="w-4 h-4 mr-2" /> Create Slot</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── Slots List ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Your Slots</h2>
          <Select
            value={selService}
            onChange={e => setSelService(e.target.value)}
            className="w-48"
          >
            <option value="">All services</option>
            {services.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </Select>
        </div>

        {slotLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2 animate-pulse">
                  <div className="h-4 w-32 rounded bg-white/5" />
                  <div className="h-3 w-24 rounded bg-white/5" />
                  <div className="h-3 w-20 rounded bg-white/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSlots.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
              <p className="text-zinc-500">No slots yet. Add one above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSlots.map(slot => (
              <Card key={slot._id} className="group hover:border-white/15 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-zinc-200 truncate mr-2">
                      {slot.serviceId?.name ?? '—'}
                    </span>
                    <Badge variant={slot.status}>{slot.status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(slot.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-4.5">
                      <span>→ {formatDate(slot.endTime)}</span>
                    </div>
                  </div>
                  {slot.status === 'available' && (
                    <button
                      onClick={() => handleDeleteSlot(slot._id)}
                      className="mt-3 flex items-center gap-1 text-xs text-zinc-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
