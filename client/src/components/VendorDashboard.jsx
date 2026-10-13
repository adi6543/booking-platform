import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getVendorDashboardStats, updateVendorProfile as updateProfile,
  getVendorOwnReviews, getVendorServices, getPauseStatus,
  pauseVendor, resumeVendor, createService, deleteService
} from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Badge } from './ui/badge';
import {
  Star, TrendingUp, Users, IndianRupee, CalendarCheck,
  BarChart3, Loader2, Check, Edit3, ShieldCheck, Zap,
  ExternalLink, Calendar, Plus, Clock, MapPin, Phone,
  AlertCircle, Sparkles, Coffee, Play, Trash2, ArrowRight, CheckCircle2
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select category…' },
  { value: 'plumbing', label: '🔧 Plumbing' },
  { value: 'salon', label: '💇 Salon & Grooming' },
  { value: 'cleaning', label: '🧹 Home Cleaning' },
  { value: 'electrician', label: '⚡ Electrician' },
  { value: 'tutor', label: '📚 Home Tutor' },
  { value: 'appliance-repair', label: '🔨 Appliance Repair' },
  { value: 'painting', label: '🎨 Painting' },
  { value: 'carpentry', label: '🪵 Carpentry' },
  { value: 'other', label: '🔩 Other' }
];

function StatCard({ icon, label, value, sub, color = 'text-zinc-900', badge }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4.5 hover:border-zinc-300 hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-border flex items-center justify-center">
            {icon}
          </div>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 font-medium mb-1">{label}</p>
        <p className={`text-2xl font-bold font-mono tracking-tight ${color}`}>{value}</p>
      </div>
      {sub && <p className="text-[11px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100">{sub}</p>}
    </div>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
}

export default function VendorDashboard() {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const toastCtx = useToast();
  const toastSuccess = toastCtx?.success || toastCtx?.toastSuccess || (() => {});
  const toastError   = toastCtx?.error   || toastCtx?.toastError   || (() => {});

  const [stats, setStats]         = useState(null);
  const [reviews, setReviews]     = useState([]);
  const [services, setServices]   = useState([]);
  const [pauseData, setPauseData] = useState({ isPaused: false });
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Pause action loading
  const [pausing, setPausing] = useState(false);

  // New Service Modal/Form State
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', category: '', description: '' });
  const [creatingService, setCreatingService] = useState(false);

  // Profile edit form
  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', businessName: '', businessDescription: '',
    category: '', city: '', area: '', pinCode: ''
  });
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'vendor') navigate('/');
  }, [user, navigate]);

  const loadAllData = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getVendorDashboardStats(token).catch(() => null),
      getVendorOwnReviews(token).catch(() => []),
      getVendorServices(token).catch(() => []),
      getPauseStatus(token).catch(() => ({ isPaused: false }))
    ])
      .then(([statsData, reviewsData, servicesData, pauseInfo]) => {
        setStats(statsData);
        setReviews(reviewsData || []);
        setServices(servicesData || []);
        setPauseData(pauseInfo || { isPaused: false });
      })
      .catch(e => toastError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAllData();
  }, [token]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        businessName: user.businessName || '',
        businessDescription: user.businessDescription || '',
        category: user.category || '',
        city: user.city || '',
        area: user.area || '',
        pinCode: user.pinCode || ''
      });
    }
  }, [user]);

  const handlePause = async (minutes) => {
    setPausing(true);
    try {
      await pauseVendor(token, minutes, 'Walk-in customer / quick break');
      toastSuccess(`Paused incoming bookings for ${minutes} mins.`);
      const status = await getPauseStatus(token);
      setPauseData(status);
    } catch (err) {
      toastError(err.message);
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async () => {
    setPausing(true);
    try {
      await resumeVendor(token);
      toastSuccess('Resumed! Booking slots are available again.');
      const status = await getPauseStatus(token);
      setPauseData(status);
    } catch (err) {
      toastError(err.message);
    } finally {
      setPausing(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await updateProfile(token, profileForm);
      login(token, result.user);
      toastSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!newService.name.trim()) {
      toastError('Service name is required');
      return;
    }
    setCreatingService(true);
    try {
      const priceNum = Number(newService.price) >= 0 ? Number(newService.price) : 500;
      await createService(token, {
        name: newService.name.trim(),
        price: priceNum,
        category: newService.category || user?.category || 'other',
        description: newService.description.trim()
      });
      toastSuccess('Service added successfully!');
      setNewService({ name: '', price: '', category: '', description: '' });
      setShowAddService(false);
      const updatedServices = await getVendorServices(token);
      setServices(updatedServices);
    } catch (err) {
      toastError(err.message);
    } finally {
      setCreatingService(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteService(token, serviceId);
      toastSuccess('Service removed');
      setServices(prev => prev.filter(s => s._id !== serviceId));
    } catch (err) {
      toastError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 bg-zinc-200 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-zinc-100 rounded-2xl" />)}
          </div>
          <div className="h-64 bg-zinc-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const categoryName = CATEGORY_OPTIONS.find(c => c.value === user?.category)?.label || user?.category || 'Local Service';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* ── 1. Platform Store Header ────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle accent backdrop */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />

        <div className="space-y-3 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {categoryName}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Verified Vendor</span>
            </span>
            {pauseData?.isPaused && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 animate-pulse">
                <Coffee className="w-3 h-3" />
                <span>Walk-in Pause Active</span>
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              {user?.businessName || user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{[user?.area, user?.city].filter(Boolean).join(', ') || 'Bengaluru'}</span>
              <span>•</span>
              <span className="text-zinc-600 font-medium">Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            </p>
          </div>

          {/* Platform status indicator pills */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Rolling 14-Day Generator: Active
            </span>
            <span className="text-zinc-300 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Concurrency Lock: Protected
            </span>
          </div>
        </div>

        {/* Action Buttons & Fast Walk-in Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10 shrink-0">
          {pauseData?.isPaused ? (
            <Button
              onClick={handleResume}
              disabled={pausing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
            >
              <Play className="w-4 h-4 mr-1.5" />
              <span>Resume Bookings</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200/80 rounded-xl p-1.5">
              <span className="text-xs font-semibold text-zinc-600 px-2">Busy Right Now?</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePause(30)}
                disabled={pausing}
                className="text-xs h-7 px-2.5 bg-white border-zinc-200 text-zinc-700 hover:border-amber-300"
              >
                30m
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePause(60)}
                disabled={pausing}
                className="text-xs h-7 px-2.5 bg-white border-zinc-200 text-zinc-700 hover:border-amber-300"
              >
                60m
              </Button>
            </div>
          )}

          <Link to={`/vendor/${user?._id}`}>
            <Button variant="outline" className="w-full sm:w-auto border-zinc-300 text-zinc-700 hover:text-zinc-900">
              <span>Customer Storefront</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5 text-zinc-400" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 2. Performance Metric Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}
          label="Today's Appointments"
          value={stats?.todayBookings || 0}
          color="text-blue-700"
          badge={stats?.todayBookings > 0 ? 'Live Today' : null}
          sub="Confirmed bookings scheduled today"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          label="This Week"
          value={stats?.weekBookings || 0}
          sub={`₹${(stats?.weekRevenue || 0).toLocaleString('en-IN')} revenue this week`}
          color="text-emerald-700"
          badge="+18% vs prev"
        />
        <StatCard
          icon={<IndianRupee className="w-5 h-5 text-amber-600" />}
          label="Total Revenue"
          value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`}
          sub={`${stats?.confirmedBookings || 0} lifetime confirmed bookings`}
          color="text-amber-700"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-amber-500 fill-amber-400" />}
          label="Average Rating"
          value={stats?.averageRating > 0 ? `${stats.averageRating}★` : '—'}
          sub={`${stats?.totalReviews || 0} verified reviews · ${stats?.cancellationRate || 0}% cancel rate`}
        />
      </div>

      {/* ── 3. Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex border-b border-border text-sm font-medium">
        {[
          { key: 'overview', label: 'Platform Overview' },
          { key: 'services', label: `My Services (${services.length})` },
          { key: 'profile', label: 'Business Profile' },
          { key: 'reviews', label: `Customer Reviews (${reviews.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-4 border-b-2 transition-colors cursor-pointer text-xs sm:text-sm ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 4. Main Content Area: 2-Column Responsive Layout ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Left / Primary Column (2 Cols) ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Platform Engine Callout Card */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Rolling 14-Day Calendar Generator</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Availability is automatically replenished daily.
                  </h3>
                  <p className="text-xs text-blue-100 max-w-lg leading-relaxed">
                    Set your weekly hours once. The scheduler keeps a 14-day rolling booking window published so customers can book instantly.
                  </p>
                </div>
                <Link to="/vendor/slots">
                  <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shrink-0 shadow">
                    Edit Hours →
                  </Button>
                </Link>
              </div>

              {/* Live Services Quick View */}
              <div className="bg-white border border-border rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-zinc-900 text-base">Your Active Services</h3>
                    <p className="text-xs text-zinc-500">Services visible to customers for slot booking</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('services')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
                  </Button>
                </div>

                {services.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                    <p className="text-xs text-zinc-500 mb-2">You haven't listed any services yet.</p>
                    <Button size="sm" onClick={() => setActiveTab('services')}>
                      Create First Service
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {services.map(s => (
                      <div
                        key={s._id}
                        className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/60 hover:bg-white hover:border-zinc-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-semibold text-zinc-900 text-sm">{s.name}</span>
                            <span className="font-bold text-emerald-700 text-xs px-2 py-0.5 rounded bg-emerald-100/70 shrink-0">
                              ₹{s.price}
                            </span>
                          </div>
                          {s.description && (
                            <p className="text-xs text-zinc-500 line-clamp-2 mb-2 leading-relaxed">
                              {s.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-400">
                          <span>{s.category || 'General'}</span>
                          <Link to="/vendor/slots" className="text-blue-600 font-semibold hover:underline">
                            Manage slots →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Confirmed Bookings */}
              <div className="bg-white border border-border rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-zinc-900 text-base">Recent Confirmed Appointments</h3>
                    <p className="text-xs text-zinc-500">Live feed of confirmed customer appointments</p>
                  </div>
                  <Link to="/vendor/bookings" className="text-xs font-semibold text-blue-600 hover:underline">
                    View all bookings →
                  </Link>
                </div>

                {!stats?.recentBookings || stats.recentBookings.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-10 bg-zinc-50 rounded-xl">
                    No confirmed bookings yet. Once customers book and pay, they will appear here.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {stats.recentBookings.map(b => (
                      <div key={b._id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-zinc-900 text-sm">
                              {b.serviceId?.name || 'Service'}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                              Paid &amp; Confirmed
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            Customer: <strong className="text-zinc-800 font-medium">{b.customerId?.name || 'Customer'}</strong>
                          </p>
                          {b.slotId && (
                            <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              <span>{formatDate(b.slotId.startTime)}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-sm text-zinc-900 block">
                            ₹{b.serviceId?.price || (b.amount ? b.amount / 100 : '—')}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            #{String(b._id).slice(-6).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SERVICES MANAGER */}
          {activeTab === 'services' && (
            <div className="bg-white border border-border rounded-2xl p-5 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">Service Listings</h3>
                  <p className="text-xs text-zinc-500">Define the services customers can book appointments for</p>
                </div>
                {!showAddService && (
                  <Button size="sm" onClick={() => setShowAddService(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
                  </Button>
                )}
              </div>

              {/* Add Service Inline Form */}
              {showAddService && (
                <form onSubmit={handleCreateService} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                  <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">New Service Details</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700">Service Name *</label>
                      <Input
                        value={newService.name}
                        onChange={e => setNewService(s => ({ ...s, name: e.target.value }))}
                        placeholder="e.g. AC Filter Deep Cleaning"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700">Price (₹) *</label>
                      <Input
                        type="number"
                        min="0"
                        value={newService.price}
                        onChange={e => setNewService(s => ({ ...s, price: e.target.value }))}
                        placeholder="1200"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Category</label>
                    <Select
                      value={newService.category}
                      onChange={e => setNewService(s => ({ ...s, category: e.target.value }))}
                    >
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Description</label>
                    <textarea
                      rows={2}
                      value={newService.description}
                      onChange={e => setNewService(s => ({ ...s, description: e.target.value }))}
                      placeholder="Brief details about what is included..."
                      className="w-full text-xs p-2 rounded-lg border border-border bg-white outline-none resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" disabled={creatingService} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                      {creatingService ? 'Adding…' : 'Save Service'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddService(false)} className="text-xs">
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Service Cards List */}
              <div className="space-y-3">
                {services.map(s => (
                  <div key={s._id} className="p-4 rounded-xl border border-zinc-200 bg-white flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900 text-sm">{s.name}</h4>
                        <span className="text-xs font-bold text-emerald-700">₹{s.price}</span>
                      </div>
                      {s.description && <p className="text-xs text-zinc-500 leading-relaxed">{s.description}</p>}
                      <span className="text-[11px] text-zinc-400 capitalize">Category: {s.category || 'General'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link to="/vendor/slots">
                        <Button size="sm" variant="outline" className="text-xs h-8">
                          Slots
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(s._id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Delete service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BUSINESS PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-border rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">Store &amp; Location Profile</h3>
                  <p className="text-xs text-zinc-500">Public profile details displayed across the platform</p>
                </div>
                {!editing && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="text-xs">
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
                  </Button>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Display Name</label>
                    <Input
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                      disabled={!editing}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Phone</label>
                    <Input
                      value={profileForm.phone}
                      onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                      disabled={!editing}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Business / Store Name</label>
                  <Input
                    value={profileForm.businessName}
                    onChange={e => setProfileForm(f => ({ ...f, businessName: e.target.value }))}
                    disabled={!editing}
                    placeholder="e.g. TechFix Repairs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Business Bio</label>
                  <textarea
                    className="flex w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 min-h-[80px] resize-none"
                    value={profileForm.businessDescription}
                    onChange={e => setProfileForm(f => ({ ...f, businessDescription: e.target.value }))}
                    disabled={!editing}
                    placeholder="Tell neighbourhood customers about your experience, warranty, and expertise…"
                    maxLength={500}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Primary Category</label>
                  <Select
                    value={profileForm.category}
                    onChange={e => setProfileForm(f => ({ ...f, category: e.target.value }))}
                    disabled={!editing}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">City</label>
                    <Input
                      value={profileForm.city}
                      onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
                      disabled={!editing}
                      placeholder="Bengaluru"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Area</label>
                    <Input
                      value={profileForm.area}
                      onChange={e => setProfileForm(f => ({ ...f, area: e.target.value }))}
                      disabled={!editing}
                      placeholder="Koramangala"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700">Pin Code</label>
                    <Input
                      value={profileForm.pinCode}
                      onChange={e => setProfileForm(f => ({ ...f, pinCode: e.target.value }))}
                      disabled={!editing}
                      placeholder="560034"
                    />
                  </div>
                </div>

                {editing && (
                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs">
                      {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditing(false)} className="text-xs">
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 4: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="bg-white border border-border rounded-2xl p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Customer Feedback &amp; Ratings</h3>
                <p className="text-xs text-zinc-500">Verified reviews submitted by clients upon appointment completion</p>
              </div>

              {reviews.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-10 bg-zinc-50 rounded-xl">
                  No customer reviews yet. Reviews will automatically be posted here once customers rate your service!
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {reviews.map(r => (
                    <div key={r._id} className="py-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                            {r.customerId?.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-zinc-900 block">{r.customerId?.name || 'Customer'}</span>
                            <span className="text-[10px] text-zinc-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                          <span className="text-xs font-bold text-amber-800">{r.rating}.0</span>
                        </div>
                      </div>
                      {r.comment && <p className="text-xs text-zinc-700 leading-relaxed pl-9">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right / Platform Rail Column (1 Col - Clean, Small Text at Side) ─ */}
        <div className="space-y-5">
          {/* Platform Operations Rail */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">Platform Engine</h4>
                <p className="text-[10px] text-zinc-400">Live automation guards</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-600">
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800 text-[11px]">14-Day Rolling Slots</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">Active</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Generated automatically every night based on your recurring hours.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800 text-[11px]">10-Min Hold Exclusivity</span>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.2 rounded">Guarded</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Atomic locks prevent double-booking collisions during customer checkouts.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800 text-[11px]">Instant Verification</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">Online</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Razorpay &amp; simulated cryptographic signatures confirm payments instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">Quick Management</h4>
            <div className="space-y-1.5">
              <Link
                to="/vendor/slots"
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all text-xs font-medium text-zinc-800 group"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Manage Weekly Hours &amp; Slots</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/vendor/bookings"
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all text-xs font-medium text-zinc-800 group"
              >
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>Incoming Bookings Feed</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to={`/vendor/${user?._id}`}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all text-xs font-medium text-zinc-800 group"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                  <span>View Public Storefront</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Compact Pro Tips Widget (Small text at side) */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4.5 text-[11px] text-zinc-500 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-zinc-800 uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Platform Best Practices</span>
            </div>
            <ul className="space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                <span>Use the <strong>"Busy Right Now"</strong> buttons above during walk-ins to pause online bookings without deleting your schedule.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                <span>Services with descriptions and clear prices receive 40% higher direct conversions.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                <span>The AI Assistant recommends providers with recent completed bookings and 4.5+ star ratings first.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
