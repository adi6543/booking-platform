import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import {
  getVendorServices, getVendorSlots, createService, deleteService,
  createSlot, deleteSlot,
  getVendorAvailability, saveVendorAvailability, deleteVendorAvailability, generateVendorSlots,
  getVendorBlackouts, addVendorBlackout, deleteVendorBlackout,
  toggleBlockSlot, pauseVendor, resumeVendor, getPauseStatus
} from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Badge } from './ui/badge';
import {
  Loader2, Trash2, Clock, Calendar, Ban, PlayCircle, PauseCircle,
  Plus, Check, AlertCircle, RefreshCw
} from 'lucide-react';

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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VendorSlots() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const confirm = useConfirm();

  // Data states
  const [services, setServices]         = useState([]);
  const [slots, setSlots]               = useState([]);
  const [schedules, setSchedules]       = useState([]);
  const [blackouts, setBlackouts]       = useState([]);
  const [pauseInfo, setPauseInfo]       = useState({ isPaused: false });
  const [selService, setSelService]     = useState('');

  // Service creation form
  const [newServiceName, setNewServiceName]   = useState('');
  const [newServicePrice, setNewServicePrice] = useState('500');

  // Recurring schedule form
  const [schedForm, setSchedForm] = useState({
    serviceId: '',
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat default
    startTime: '09:00',
    endTime: '18:00',
    slotDurationMinutes: 60
  });

  // Blackout date form
  const [blackoutDate, setBlackoutDate]     = useState('');
  const [blackoutReason, setBlackoutReason] = useState('Shop closed / Holiday');

  // Single manual slot form
  const [singleSlotForm, setSingleSlotForm] = useState({ serviceId: '', startTime: '', endTime: '' });
  const [showManualForm, setShowManualForm] = useState(false);

  // Loading states
  const [loading, setLoading]           = useState(false);
  const [slotLoading, setSlotLoading]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Active section tab
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'blackouts' | 'services'

  // Redirect non-vendors
  useEffect(() => {
    if (user && user.role !== 'vendor') navigate('/');
  }, [user, navigate]);

  const loadAllData = async () => {
    if (!token) return;
    try {
      const [svcData, schedData, blackData, pauseData] = await Promise.all([
        getVendorServices(token),
        getVendorAvailability(token),
        getVendorBlackouts(token),
        getPauseStatus(token)
      ]);
      setServices(svcData);
      setSchedules(schedData);
      setBlackouts(blackData);
      setPauseInfo(pauseData);

      if (svcData.length > 0 && !schedForm.serviceId) {
        setSchedForm(f => ({ ...f, serviceId: svcData[0]._id }));
      }
    } catch (e) {
      toastError(e.message);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [token]);

  // Fetch slots whenever selection or token changes
  const fetchSlots = () => {
    if (!token) return;
    setSlotLoading(true);
    getVendorSlots(token, selService || undefined)
      .then(setSlots)
      .catch(e => toastError(e.message))
      .finally(() => setSlotLoading(false));
  };

  useEffect(() => {
    fetchSlots();
  }, [token, selService]);

  // ── Quick Walk-in Pause / Resume ──────────────────────────────────────────
  const handleQuickPause = async (minutes) => {
    setActionLoading(true);
    try {
      const res = await pauseVendor(token, minutes, 'Busy with walk-in customers');
      toastSuccess(res.message);
      await loadAllData();
      fetchSlots();
    } catch (err) {
      toastError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickResume = async () => {
    setActionLoading(true);
    try {
      const res = await resumeVendor(token);
      toastSuccess(res.message);
      await loadAllData();
      fetchSlots();
    } catch (err) {
      toastError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Toggle Block on Individual Slot ────────────────────────────────────────
  const handleToggleBlock = async (slot) => {
    const nextState = !slot.isBlocked;
    try {
      const res = await toggleBlockSlot(token, slot._id, nextState, nextState ? 'Walk-in customer' : undefined);
      toastSuccess(res.message);
      setSlots(prev => prev.map(s => s._id === slot._id ? { ...s, isBlocked: nextState, blockedReason: nextState ? 'Walk-in customer' : undefined } : s));
      const pData = await getPauseStatus(token);
      setPauseInfo(pData);
    } catch (err) {
      toastError(err.message);
    }
  };

  // ── Save Recurring Weekly Schedule ─────────────────────────────────────────
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!schedForm.serviceId) {
      toastError('Please select a service for the schedule.');
      return;
    }
    if (schedForm.daysOfWeek.length === 0) {
      toastError('Please select at least one working day.');
      return;
    }
    setLoading(true);
    try {
      const res = await saveVendorAvailability(token, schedForm);
      toastSuccess(res.message);
      await loadAllData();
      fetchSlots();
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    const ok = await confirm('Remove this recurring schedule? Existing slots will remain, but new ones will no longer generate.');
    if (!ok) return;
    try {
      await deleteVendorAvailability(token, id);
      setSchedules(prev => prev.filter(s => s._id !== id));
      toastSuccess('Recurring schedule removed.');
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleRefreshRollingSlots = async () => {
    setActionLoading(true);
    try {
      const res = await generateVendorSlots(token);
      toastSuccess(res.message);
      fetchSlots();
    } catch (err) {
      toastError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Blackout Dates ─────────────────────────────────────────────────────────
  const handleAddBlackout = async (e) => {
    e.preventDefault();
    if (!blackoutDate) {
      toastError('Please pick a date.');
      return;
    }
    setLoading(true);
    try {
      const res = await addVendorBlackout(token, { date: blackoutDate, reason: blackoutReason });
      toastSuccess(res.message);
      setBlackoutDate('');
      await loadAllData();
      fetchSlots();
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlackout = async (id, date) => {
    const ok = await confirm(`Remove closure for ${date}? Available slots for this day will be restored.`);
    if (!ok) return;
    try {
      const res = await deleteVendorBlackout(token, id);
      toastSuccess(res.message);
      await loadAllData();
      fetchSlots();
    } catch (err) {
      toastError(err.message);
    }
  };

  // ── Create Service ─────────────────────────────────────────────────────────
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
      if (!schedForm.serviceId) setSchedForm(f => ({ ...f, serviceId: s._id }));
      toastSuccess(`Service "${s.name}" (₹${priceVal}) created!`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id, name) => {
    const ok = await confirm(`Delete service "${name}"?`);
    if (!ok) return;
    try {
      await deleteService(token, id);
      setServices(prev => prev.filter(s => s._id !== id));
      toastSuccess('Service deleted.');
    } catch (err) {
      toastError(err.message);
    }
  };

  // ── Single Manual Slot ─────────────────────────────────────────────────────
  const handleCreateSingleSlot = async (e) => {
    e.preventDefault();
    const { serviceId, startTime, endTime } = singleSlotForm;
    if (!serviceId || !startTime || !endTime) {
      toastError('All fields required.');
      return;
    }
    setLoading(true);
    try {
      const slot = await createSlot(token, {
        serviceId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setSlots(prev => [slot, ...prev]);
      setSingleSlotForm(f => ({ ...f, startTime: '', endTime: '' }));
      toastSuccess('Slot created!');
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    const ok = await confirm('Delete this slot?');
    if (!ok) return;
    try {
      await deleteSlot(token, slotId);
      setSlots(prev => prev.filter(s => s._id !== slotId));
      toastSuccess('Slot deleted.');
    } catch (err) {
      toastError(err.message);
    }
  };

  const toggleDay = (dayIdx) => {
    setSchedForm(f => {
      const exists = f.daysOfWeek.includes(dayIdx);
      const nextDays = exists ? f.daysOfWeek.filter(d => d !== dayIdx) : [...f.daysOfWeek, dayIdx].sort();
      return { ...f, daysOfWeek: nextDays };
    });
  };

  const filteredSlots = selService
    ? slots.filter(s => (s.serviceId?._id ?? s.serviceId) === selService)
    : slots;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
            Availability &amp; Slots
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Auto-generate recurring weekly slots and handle offline walk-in customers instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshRollingSlots}
            disabled={actionLoading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${actionLoading ? 'animate-spin' : ''}`} />
            Refresh 14-Day Slots
          </Button>
        </div>
      </div>

      {/* ── Feature 2: "Busy Right Now" Walk-in Control Bar ────────────────── */}
      <div className={`rounded-xl border p-4 transition-all ${
        pauseInfo.isPaused
          ? 'bg-amber-50/80 border-amber-300'
          : 'bg-white border-border'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              pauseInfo.isPaused ? 'bg-amber-500 text-white' : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              {pauseInfo.isPaused ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900 text-sm">
                  {pauseInfo.isPaused ? 'Walk-in Mode Active (Paused)' : 'Online Booking Active'}
                </span>
                <Badge variant={pauseInfo.isPaused ? 'pending' : 'available'}>
                  {pauseInfo.isPaused ? 'Walk-in Busy' : 'Online & Open'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                {pauseInfo.isPaused ? (
                  <>
                    Temporarily paused until <strong>{formatTimeOnly(pauseInfo.pauseUntil)}</strong>. {pauseInfo.blockedCount} upcoming slots are hidden from online booking.
                  </>
                ) : (
                  'Customers can book your available slots online. Have a walk-in customer? Pause below to instantly block overlapping slots.'
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {pauseInfo.isPaused ? (
              <Button
                size="sm"
                onClick={handleQuickResume}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Resume Online Booking
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-zinc-500 mr-1">Walk-in Pause:</span>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={actionLoading}
                  onClick={() => handleQuickPause(30)}
                  className="bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800"
                >
                  30 min
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={actionLoading}
                  onClick={() => handleQuickPause(60)}
                  className="bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800"
                >
                  1 hour
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={actionLoading}
                  onClick={() => handleQuickPause(120)}
                  className="bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800"
                >
                  2 hours
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs for Configuration ────────────────────────────────────────── */}
      <div className="flex border-b border-border text-sm font-medium">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-4 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'schedule'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Weekly Recurring Hours ({schedules.length})
        </button>
        <button
          onClick={() => setActiveTab('blackouts')}
          className={`pb-3 px-4 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'blackouts'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Closed Dates &amp; Holidays ({blackouts.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 px-4 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'services'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Manage Services ({services.length})
        </button>
      </div>

      {/* ── TAB 1: Weekly Recurring Hours ──────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Schedule Setter Form */}
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <div>
              <h2 className="font-bold text-zinc-900 text-base">Set Weekly Working Hours</h2>
              <p className="text-xs text-zinc-500">
                Choose your service and regular hours. Slots will automatically generate for the rolling next 14 days.
              </p>
            </div>

            {services.length === 0 ? (
              <div className="p-4 bg-zinc-50 border border-border rounded-lg text-xs text-zinc-600">
                Please create a service first in the <strong>Manage Services</strong> tab.
              </div>
            ) : (
              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Select Service</label>
                  <Select
                    value={schedForm.serviceId}
                    onChange={e => setSchedForm(f => ({ ...f, serviceId: e.target.value }))}
                  >
                    {services.map(s => (
                      <option key={s._id} value={s._id}>{s.name} (₹{s.price})</option>
                    ))}
                  </Select>
                </div>

                {/* Days of week selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Working Days</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_NAMES.map((name, idx) => {
                      const selected = schedForm.daysOfWeek.includes(idx);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-zinc-600 border-border hover:border-zinc-300'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Opening & Closing Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Opening Time</label>
                    <Input
                      type="time"
                      value={schedForm.startTime}
                      onChange={e => setSchedForm(f => ({ ...f, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Closing Time</label>
                    <Input
                      type="time"
                      value={schedForm.endTime}
                      onChange={e => setSchedForm(f => ({ ...f, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Slot Duration */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Slot Duration</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 45, 60, 90].map(dur => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSchedForm(f => ({ ...f, slotDurationMinutes: dur }))}
                        className={`py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          schedForm.slotDurationMinutes === dur
                            ? 'bg-blue-50 border-blue-600 text-blue-700 font-semibold ring-1 ring-blue-600'
                            : 'bg-white border-border text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        {dur} min
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Slots…</> : 'Save & Auto-Generate Next 14 Days'}
                </Button>
              </form>
            )}
          </div>

          {/* Active Recurring Patterns List */}
          <div className="bg-white border border-border rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-zinc-900 text-base">Active Weekly Schedules</h2>
                <span className="text-xs text-zinc-500 font-mono">{schedules.length} active</span>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                These patterns maintain a live rolling 14-day booking calendar.
              </p>

              {schedules.length === 0 ? (
                <div className="py-10 text-center text-zinc-400 text-xs border border-dashed border-border rounded-lg">
                  No weekly schedules defined yet. Set your working hours on the left to start taking bookings.
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map(sc => (
                    <div
                      key={sc._id}
                      className="p-3.5 rounded-lg border border-border bg-zinc-50/50 hover:bg-zinc-50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 text-sm">
                            {sc.serviceId?.name || 'Service'}
                          </span>
                          <span className="text-xs font-mono text-zinc-500 bg-white px-2 py-0.5 rounded border border-border">
                            {sc.slotDurationMinutes}m slots
                          </span>
                        </div>
                        <div className="text-xs text-zinc-600">
                          {sc.startTime} – {sc.endTime} ·{' '}
                          <span className="text-zinc-500">
                            {sc.daysOfWeek.map(d => DAY_NAMES[d]).join(', ')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSchedule(sc._id)}
                        className="text-zinc-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                        title="Remove schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowManualForm(v => !v)}
                className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showManualForm ? 'Hide manual slot creator' : 'Need to add a single ad-hoc slot manually?'}
              </button>

              {showManualForm && (
                <form onSubmit={handleCreateSingleSlot} className="mt-3 p-3 bg-zinc-50 border border-border rounded-lg space-y-2">
                  <p className="text-[11px] text-zinc-500 font-medium">Single Custom Slot:</p>
                  <Select
                    value={singleSlotForm.serviceId}
                    onChange={e => setSingleSlotForm(f => ({ ...f, serviceId: e.target.value }))}
                  >
                    <option value="">Select service…</option>
                    {services.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="datetime-local"
                      value={singleSlotForm.startTime}
                      onChange={e => setSingleSlotForm(f => ({ ...f, startTime: e.target.value }))}
                      className="text-xs"
                    />
                    <Input
                      type="datetime-local"
                      value={singleSlotForm.endTime}
                      onChange={e => setSingleSlotForm(f => ({ ...f, endTime: e.target.value }))}
                      className="text-xs"
                    />
                  </div>
                  <Button type="submit" size="xs" disabled={loading} className="w-full bg-blue-600 text-white">
                    Create single slot
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Closed Dates & Holidays ─────────────────────────────────── */}
      {activeTab === 'blackouts' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <div>
              <h2 className="font-bold text-zinc-900 text-base">Mark Shop Closed / Holiday</h2>
              <p className="text-xs text-zinc-500">
                Pick a date when your shop or service is closed. Any unbooked slots on this date will be automatically removed from online browsing.
              </p>
            </div>

            <form onSubmit={handleAddBlackout} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Closure Date</label>
                <Input
                  type="date"
                  value={blackoutDate}
                  onChange={e => setBlackoutDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Reason (Optional)</label>
                <Input
                  value={blackoutReason}
                  onChange={e => setBlackoutReason(e.target.value)}
                  placeholder="e.g. Diwali Holiday, Staff Leave, Renovation"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !blackoutDate}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                <Ban className="w-4 h-4 mr-1.5" />
                Mark Date Closed
              </Button>
            </form>
          </div>

          <div className="bg-white border border-border rounded-xl p-5">
            <h2 className="font-bold text-zinc-900 text-base mb-1">Upcoming Closed Dates</h2>
            <p className="text-xs text-zinc-500 mb-4">Dates when slot generation is actively skipped.</p>

            {blackouts.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs border border-dashed border-border rounded-lg">
                No closed dates configured. All weekly active days will accept bookings.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {blackouts.map(b => (
                  <div key={b._id} className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-zinc-50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div>
                        <div className="font-bold text-zinc-900 text-xs font-mono">{b.date}</div>
                        <div className="text-[11px] text-zinc-500">{b.reason || 'Closed'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBlackout(b._id, b.date)}
                      className="text-zinc-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                      title="Remove closed date"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Manage Services ─────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-bold text-zinc-900 text-base">Your Services List</h2>
            <p className="text-xs text-zinc-500">Add or remove the services you offer to customers.</p>
          </div>

          <form onSubmit={handleCreateService} className="flex gap-2 max-w-lg">
            <Input
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              placeholder="Service name (e.g. Bridal Makeup)"
              className="flex-1"
            />
            <Input
              type="number"
              min="0"
              value={newServicePrice}
              onChange={e => setNewServicePrice(e.target.value)}
              placeholder="₹ Price"
              className="w-28 font-mono"
            />
            <Button
              type="submit"
              disabled={loading || !newServiceName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </form>

          {services.length > 0 ? (
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden max-w-2xl">
              {services.map(s => (
                <div key={s._id} className="flex items-center justify-between p-3 bg-white hover:bg-zinc-50">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-zinc-900 text-sm">{s.name}</span>
                    <span className="text-xs font-mono font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      ₹{s.price}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteService(s._id, s.name)}
                    className="text-zinc-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-2">No services added yet.</p>
          )}
        </div>
      )}

      {/* ── Table of Generated Slots (Dense Scannable Management) ──────────── */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-zinc-900 text-base">14-Day Generated Slots</h2>
            <p className="text-xs text-zinc-500">
              Live calendar slots. Click <strong>Block for Walk-in</strong> on any row to instantly hold it for an offline customer.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Filter:</span>
            <Select
              value={selService}
              onChange={e => setSelService(e.target.value)}
              className="w-44 h-8 text-xs"
            >
              <option value="">All services</option>
              {services.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {slotLoading ? (
          <div className="py-12 text-center text-xs text-zinc-400">Loading slots…</div>
        ) : filteredSlots.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm border border-dashed border-border rounded-lg">
            No slots found. Use the <strong>Weekly Recurring Hours</strong> tab above to generate your schedule.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-border text-zinc-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Service</th>
                  <th className="py-2.5 px-4">Date &amp; Time Window</th>
                  <th className="py-2.5 px-4">Duration</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Walk-in Override &amp; Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSlots.map(slot => {
                  const duration = Math.round((new Date(slot.endTime) - new Date(slot.startTime)) / 60000);
                  const isBooked = slot.status === 'booked' || slot.status === 'reserved';
                  const isBlocked = !!slot.isBlocked;

                  return (
                    <tr
                      key={slot._id}
                      className={`transition-colors ${
                        isBlocked ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        {slot.serviceId?.name ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-zinc-700">
                        <div>{formatDate(slot.startTime)}</div>
                        <div className="text-zinc-500 text-[11px]">to {formatTimeOnly(slot.endTime)}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono">
                        {duration}m
                      </td>
                      <td className="py-3 px-4">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            Blocked (Walk-in)
                          </span>
                        ) : (
                          <Badge variant={slot.status}>
                            {slot.status}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isBooked && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleToggleBlock(slot)}
                              className={`text-[11px] h-7 px-2.5 font-medium ${
                                isBlocked
                                  ? 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                                  : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                              }`}
                            >
                              {isBlocked ? 'Unblock Slot' : 'Block for Walk-in'}
                            </Button>
                          )}

                          {!isBooked && !isBlocked && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleDeleteSlot(slot._id)}
                              className="text-zinc-400 hover:text-red-600 hover:bg-red-50 p-1"
                              title="Delete individual slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
