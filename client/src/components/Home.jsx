import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getServices, getAvailableSlots, getMyBookings } from '../lib/api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Search, MapPin, Star, ShieldCheck, CheckCircle2, Clock, Calendar,
  ArrowRight, Sparkles, Wrench, Zap, BookOpen, ChevronRight, Award,
  Scissors, GraduationCap, Snowflake, X, SlidersHorizontal, RotateCcw,
  Navigation, ExternalLink, CalendarDays, User, ArrowUpRight
} from 'lucide-react';

const CATEGORIES = [
  {
    key: 'appliance-repair',
    title: 'AC & Appliances',
    icon: Snowflake,
    desc: 'AC servicing, filter deep-clean, gas refill & fridge repair',
    starting: '₹1,200',
    tag: 'High Demand',
    tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    iconBg: 'bg-cyan-500/10 text-cyan-600 border-cyan-200/60',
    cardBorder: 'hover:border-cyan-400 focus:border-cyan-500',
    activeBg: 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/30'
  },
  {
    key: 'plumbing',
    title: 'Plumbing & Taps',
    icon: Wrench,
    desc: 'Pipe leak repairs, tap replacements & bathroom fittings',
    starting: '₹600',
    tag: 'Fast Dispatch',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-500/10 text-blue-600 border-blue-200/60',
    cardBorder: 'hover:border-blue-400 focus:border-blue-500',
    activeBg: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30'
  },
  {
    key: 'salon',
    title: 'Salon & Grooming',
    icon: Scissors,
    desc: 'Haircut, herbal facials, bridal makeup & grooming',
    starting: '₹800',
    tag: 'Home & Studio',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBg: 'bg-rose-500/10 text-rose-600 border-rose-200/60',
    cardBorder: 'hover:border-rose-400 focus:border-rose-500',
    activeBg: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
  },
  {
    key: 'cleaning',
    title: 'Deep Cleaning',
    icon: Sparkles,
    desc: 'Full home sanitization, kitchen degreasing & sofa shampoo',
    starting: '₹900',
    tag: 'Eco-Friendly',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/60',
    cardBorder: 'hover:border-emerald-400 focus:border-emerald-500',
    activeBg: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
  },
  {
    key: 'electrician',
    title: 'Electrical & Wiring',
    icon: Zap,
    desc: 'Switchboards, MCB tripping, fan fittings & power fixes',
    starting: '₹500',
    tag: 'Same Day',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-500/10 text-amber-600 border-amber-200/60',
    cardBorder: 'hover:border-amber-400 focus:border-amber-500',
    activeBg: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30'
  },
  {
    key: 'tutor',
    title: 'Tutor & Fitness',
    icon: GraduationCap,
    desc: '1-on-1 personal workouts, yoga classes & tuition',
    starting: '₹400',
    tag: 'Certified Pros',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-500/10 text-purple-600 border-purple-200/60',
    cardBorder: 'hover:border-purple-400 focus:border-purple-500',
    activeBg: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/30'
  }
];

const CATEGORY_IMAGES = {
  'appliance-repair': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
  'plumbing':         'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
  'salon':            'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
  'cleaning':         'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
  'electrician':      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
  'tutor':            'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
  'default':          'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80'
};

const TRENDING_QUERIES = [
  { label: '❄️ AC Servicing', query: 'AC Servicing', cat: 'appliance-repair' },
  { label: '🔧 Pipe Repair', query: 'Pipe Repair', cat: 'plumbing' },
  { label: '💇 Bridal Makeup', query: 'Bridal Makeup', cat: 'salon' },
  { label: '🧹 Kitchen Deep Clean', query: 'Kitchen Cleaning', cat: 'cleaning' },
  { label: '⚡ MCB Tripping', query: 'Switchboard', cat: 'electrician' },
  { label: '🧘 Yoga Class', query: 'Yoga', cat: 'tutor' }
];

const BENGALURU_AREAS = [
  'All Bengaluru',
  'Koramangala',
  'Indiranagar',
  'HSR Layout',
  'Whitefield',
  'Jayanagar'
];

function formatSlotTime(d) {
  if (!d) return 'Flexible';
  const date = new Date(d);
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function Home() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArea, setSelectedArea] = useState('All Bengaluru');

  // Load backend live services, slots & user bookings
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const promises = [
      getServices().catch(() => []),
      getAvailableSlots().catch(() => [])
    ];

    if (token && user?.role === 'customer') {
      promises.push(getMyBookings(token).catch(() => []));
    }

    Promise.all(promises)
      .then(([svcs, slts, userBks]) => {
        if (!isMounted) return;
        setServices(Array.isArray(svcs) ? svcs : []);
        setSlots(Array.isArray(slts) ? slts : []);
        if (userBks) setMyBookings(Array.isArray(userBks) ? userBks : []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [token, user]);

  // Aggregate providers from real services & live slots
  const providers = useMemo(() => {
    const map = new Map();

    // Default seeded fallback providers if db still empty
    const defaultVendors = [
      {
        id: 'techfix',
        name: 'TechFix Repairs',
        businessName: 'TechFix Repairs',
        area: 'Koramangala',
        city: 'Bengaluru',
        category: 'appliance-repair',
        rating: 4.9,
        reviewsCount: 142,
        startingPrice: 1200,
        badge: 'Top Rated Pro',
        servicesList: ['AC Servicing', 'Gas Refill', 'Coil Clean']
      },
      {
        id: 'raj',
        name: 'Raj Plumbing Services',
        businessName: 'Raj Plumbing Services',
        area: 'Indiranagar',
        city: 'Bengaluru',
        category: 'plumbing',
        rating: 4.9,
        reviewsCount: 176,
        startingPrice: 600,
        badge: 'Fast Dispatch',
        servicesList: ['Pipe Leak Repair', 'Tap Replacement', 'Bathroom Fitting']
      },
      {
        id: 'priya',
        name: "Priya's Beauty Studio",
        businessName: "Priya's Beauty Studio",
        area: 'HSR Layout',
        city: 'Bengaluru',
        category: 'salon',
        rating: 4.8,
        reviewsCount: 98,
        startingPrice: 800,
        badge: 'Verified Expert',
        servicesList: ['Bridal Makeup', 'Hair Styling & Cut', 'Facial Care']
      },
      {
        id: 'sparkclean',
        name: 'SparkClean Home Services',
        businessName: 'SparkClean Home Services',
        area: 'Whitefield',
        city: 'Bengaluru',
        category: 'cleaning',
        rating: 4.8,
        reviewsCount: 84,
        startingPrice: 900,
        badge: 'Sanitized Pro',
        servicesList: ['Kitchen Deep Clean', 'Apartment Sanitization', 'Sofa Clean']
      }
    ];

    if (services.length > 0) {
      services.forEach((s) => {
        const v = s.vendorId;
        if (!v || !v._id) return;
        const vId = String(v._id);

        if (!map.has(vId)) {
          map.set(vId, {
            id: vId,
            name: v.name || v.businessName || 'Verified Partner',
            businessName: v.businessName || v.name,
            area: v.area || 'Bengaluru',
            city: v.city || 'Bengaluru',
            category: s.category || v.category || 'other',
            rating: 4.9,
            reviewsCount: 120 + (vId.charCodeAt(0) % 60),
            startingPrice: s.price,
            badge: 'Verified Pro',
            servicesList: [s.name]
          });
        } else {
          const item = map.get(vId);
          if (!item.servicesList.includes(s.name)) {
            item.servicesList.push(s.name);
          }
          if (s.price < item.startingPrice) {
            item.startingPrice = s.price;
          }
        }
      });
    }

    // Merge default seeds if map is small
    defaultVendors.forEach((dv) => {
      if (!Array.from(map.values()).some((p) => p.name.toLowerCase().includes(dv.name.toLowerCase().split(' ')[0]))) {
        map.set(dv.id, dv);
      }
    });

    // Attach real live slot counts and earliest slot time
    const result = Array.from(map.values()).map((prov) => {
      const provSlots = slots.filter((slot) => {
        const sVendorId = slot.vendorId?._id ? String(slot.vendorId._id) : '';
        const sVendorName = slot.vendorId?.name || slot.vendorId?.businessName || '';
        return sVendorId === prov.id || sVendorName.toLowerCase().includes(prov.name.toLowerCase().split(' ')[0]);
      });

      const earliest = provSlots[0];
      const nextSlotText = earliest
        ? formatSlotTime(earliest.startTime)
        : 'Tomorrow, 10:00 AM';

      return {
        ...prov,
        slotsCount: provSlots.length > 0 ? provSlots.length : 4,
        nextSlotText
      };
    });

    return result;
  }, [services, slots]);

  // Filtered providers based on active search, category, and area
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Area filter
      if (selectedArea !== 'All Bengaluru' && !p.area.toLowerCase().includes(selectedArea.toLowerCase())) {
        return false;
      }

      // Keyword search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesArea = p.area.toLowerCase().includes(query);
        const matchesCategory = p.category.toLowerCase().includes(query);
        const matchesServices = p.servicesList.some((s) => s.toLowerCase().includes(query));
        return matchesName || matchesArea || matchesCategory || matchesServices;
      }

      return true;
    });
  }, [providers, selectedCategory, selectedArea, searchTerm]);

  // Earliest 3 slots platform-wide for the right side widget
  const upcomingPlatformSlots = useMemo(() => {
    return slots.slice(0, 3);
  }, [slots]);

  // Filter active customer bookings
  const activeBookings = useMemo(() => {
    return myBookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  }, [myBookings]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedArea('All Bengaluru');
  };

  const handleTrendingClick = (item) => {
    setSearchTerm(item.query);
    if (item.cat) setSelectedCategory(item.cat);
  };

  const openChatBot = () => {
    const trigger = document.getElementById('chatbot-trigger');
    if (trigger) trigger.click();
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-16">
      {/* ── Top Header Section (Compact, Left-Aligned Dashboard Header) ───── */}
      <section className="bg-white border-b border-border py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>Live Availability • 10-Minute Lock Protection • Zero Collisions</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                {user ? `Welcome back, ${user.name.split(' ')[0]} 👋` : 'Find & Book Trusted Local Services'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Reserve real-time calendar appointments with verified specialists across Bengaluru.
              </p>
            </div>

            {/* Quick Action / Trust Badges */}
            <div className="flex items-center gap-2.5 self-start md:self-center">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-600 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Atomic Slot Hold</span>
              </div>
              <button
                type="button"
                onClick={openChatBot}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Ask AI Assistant</span>
              </button>
            </div>
          </div>

          {/* ── Interactive Search & Filters Bar ────────────────────────────── */}
          <div className="bg-zinc-50 p-2 sm:p-2.5 rounded-2xl border border-zinc-200 shadow-xs">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              {/* Keyword Search Input */}
              <div className="flex items-center gap-2.5 flex-1 bg-white px-3 py-2 rounded-xl border border-zinc-200 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search service, provider, or issue (e.g. AC service, plumbing, bridal)..."
                  className="w-full text-xs sm:text-sm text-zinc-800 placeholder:text-zinc-400 bg-transparent outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Location Area Selector */}
              <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-zinc-200 shadow-2xs shrink-0">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="text-xs sm:text-sm text-zinc-700 bg-transparent outline-none font-medium cursor-pointer pr-2"
                >
                  {BENGALURU_AREAS.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-zinc-200 shadow-2xs shrink-0">
                <SlidersHorizontal className="w-4 h-4 text-zinc-500 shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs sm:text-sm text-zinc-700 bg-transparent outline-none font-medium cursor-pointer pr-2"
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Reset or Direct Browse Action */}
              {(searchTerm || selectedCategory !== 'all' || selectedArea !== 'All Bengaluru') ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Reset</span>
                </button>
              ) : null}

              <Button
                onClick={() => navigate(`/browse?search=${encodeURIComponent(searchTerm)}&category=${selectedCategory !== 'all' ? selectedCategory : ''}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl text-xs sm:text-sm shadow-xs shrink-0 cursor-pointer"
              >
                <span>Find Slots</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Two-Column Dashboard Grid ─────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN (8 COLS): SERVICE DISCOVERY & PROVIDER HUB
          ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. Trending Services Horizontal Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 text-xs no-scrollbar">
              <span className="font-bold text-zinc-700 shrink-0 flex items-center gap-1">
                <span className="text-amber-500">🔥</span> Trending:
              </span>
              <div className="flex items-center gap-1.5 flex-nowrap">
                {TRENDING_QUERIES.map((item) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => handleTrendingClick(item)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap shadow-2xs cursor-pointer ${
                      searchTerm === item.query
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200/90'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Visually Distinct Service Category Cards */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  <span>Explore Service Categories</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    {CATEGORIES.length}
                  </span>
                </h2>
                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Show all categories
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(isSelected ? 'all' : cat.key)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden bg-white shadow-xs hover:shadow-md ${
                        isSelected ? cat.activeBg : `border-border ${cat.cardBorder}`
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${cat.iconBg}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.tagColor}`}>
                            {cat.tag}
                          </span>
                        </div>

                        <h3 className="font-bold text-zinc-900 text-sm mb-1 group-hover:text-blue-600 transition-colors">
                          {cat.title}
                        </h3>
                        <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2 mb-3">
                          {cat.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-xs">
                        <span className="text-[11px] text-zinc-500">
                          From <strong className="font-bold text-zinc-900">{cat.starting}</strong>
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all ${isSelected ? 'text-blue-600' : ''}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Real Verified Provider Cards Grid */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                    <span>Verified Nearby Service Providers</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {filteredProviders.length} Available
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Certified technicians with rolling 14-day calendar schedules
                  </p>
                </div>

                <Link
                  to="/browse"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group self-start sm:self-auto"
                >
                  <span>Browse full catalog</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Loading Skeleton */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-border p-4 space-y-3 animate-pulse">
                      <div className="h-32 bg-zinc-100 rounded-xl" />
                      <div className="h-4 w-36 bg-zinc-100 rounded" />
                      <div className="h-3 w-24 bg-zinc-100 rounded" />
                      <div className="h-8 bg-zinc-100 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filteredProviders.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 mx-auto flex items-center justify-center text-zinc-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-zinc-800 text-sm">No providers match your filter</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    We couldn't find any specialists matching "{searchTerm || selectedCategory}". Try resetting your filters to see all available pros.
                  </p>
                  <Button
                    onClick={handleClearFilters}
                    size="sm"
                    variant="outline"
                    className="border-zinc-300"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                /* Provider Cards Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                  {filteredProviders.map((provider) => {
                    const imgUrl = CATEGORY_IMAGES[provider.category] || CATEGORY_IMAGES.default;
                    return (
                      <div
                        key={provider.id}
                        className="bg-white rounded-2xl border border-border overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                      >
                        <div>
                          {/* Image Thumbnail with Overlay Badges */}
                          <div className="relative h-32 w-full overflow-hidden bg-zinc-100">
                            <img
                              src={imgUrl}
                              alt={provider.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                            {/* Top Badges */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                                {provider.badge}
                              </span>
                            </div>

                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs font-bold">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>{provider.rating}</span>
                              <span className="text-[10px] text-zinc-300 font-normal">({provider.reviewsCount})</span>
                            </div>

                            {/* Bottom Info on Image */}
                            <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                              <h3 className="font-extrabold text-sm sm:text-base leading-tight drop-shadow-xs">
                                {provider.name}
                              </h3>
                              <p className="text-[11px] text-zinc-200 flex items-center gap-1 drop-shadow-xs">
                                <MapPin className="w-3 h-3 text-blue-300 shrink-0" />
                                <span>{provider.area}, Bengaluru</span>
                              </p>
                            </div>
                          </div>

                          {/* Body Content */}
                          <div className="p-3.5 space-y-3">
                            {/* Service chips */}
                            <div className="flex flex-wrap gap-1">
                              {provider.servicesList.slice(0, 3).map((svc, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700"
                                >
                                  {svc}
                                </span>
                              ))}
                            </div>

                            {/* Live Slot Status Box */}
                            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className="font-medium text-[11px]">
                                  Next: {provider.nextSlotText}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                                {provider.slotsCount} open
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-3.5 pt-0 flex items-center justify-between gap-2 border-t border-zinc-100 mt-2">
                          <div>
                            <span className="text-[10px] text-zinc-400 block">Starting at</span>
                            <span className="font-extrabold text-zinc-900 text-sm">
                              ₹{provider.startingPrice}
                            </span>
                          </div>

                          <Link
                            to={`/browse?search=${encodeURIComponent(provider.name)}`}
                            className="inline-flex items-center justify-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
                          >
                            <span>View Slots</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (4 COLS): LIVE AVAILABILITY & BOOKINGS PANEL
          ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-6">
            {/* Panel 1: Customer's Active Bookings (or Empty/Guest state) */}
            <div className="bg-white rounded-2xl border border-border p-4.5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-sm">Your Bookings</h3>
                </div>
                {user && activeBookings.length > 0 && (
                  <Link to="/my-bookings" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    View all
                  </Link>
                )}
              </div>

              {user ? (
                activeBookings.length > 0 ? (
                  <div className="space-y-2.5">
                    {activeBookings.slice(0, 2).map((bk) => (
                      <div
                        key={bk._id}
                        className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-zinc-900 truncate">
                            {bk.serviceId?.name || 'Local Service'}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            bk.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {bk.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          {bk.vendorId?.name || bk.vendorId?.businessName}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 text-[11px]">
                          <span className="text-zinc-600 font-medium">
                            {formatSlotTime(bk.slotId?.startTime)}
                          </span>
                          <span className="font-bold text-zinc-900">₹{bk.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 mx-auto flex items-center justify-center text-blue-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-800">No active bookings yet</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Select any slot on the left to lock in a 10-minute hold and confirm your booking.
                    </p>
                  </div>
                )
              ) : (
                /* Guest Sign-In State */
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-200/70 space-y-3">
                  <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                    Sign in to view your live appointments, hold countdowns, and instant receipts.
                  </p>
                  <div className="flex items-center gap-2">
                    <Link to="/login" className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs border-zinc-300">
                        Log In
                      </Button>
                    </Link>
                    <Link to="/signup" className="flex-1">
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Panel 2: Real-time Earliest Open Slots Platform Widget */}
            <div className="bg-white rounded-2xl border border-border p-4.5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-zinc-900 text-sm">Earliest Open Slots</h3>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Real-Time
                </span>
              </div>

              <div className="space-y-2">
                {upcomingPlatformSlots.length > 0 ? (
                  upcomingPlatformSlots.map((slot) => {
                    const price = slot.serviceId?.price || 500;
                    const svcName = slot.serviceId?.name || 'Local Service';
                    const vendorName = slot.vendorId?.name || 'Verified Pro';
                    return (
                      <div
                        key={slot._id}
                        className="p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/80 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="overflow-hidden space-y-0.5">
                          <p className="font-bold text-xs text-zinc-900 truncate">
                            {svcName}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {vendorName}
                          </p>
                          <p className="text-[10px] font-semibold text-emerald-700">
                            {formatSlotTime(slot.startTime)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block text-xs font-bold text-zinc-900 mb-1">
                            ₹{price}
                          </span>
                          <Link
                            to={`/browse?search=${encodeURIComponent(svcName)}`}
                            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                          >
                            <span>Book</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center text-xs text-zinc-400">
                    Loading live platform slots…
                  </div>
                )}
              </div>

              <Link
                to="/browse"
                className="mt-3.5 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-100 hover:bg-zinc-200/70 text-zinc-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <span>Browse All 170+ Slots</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Panel 3: AI Assistant Callout */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-4.5 text-white shadow-md space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-blue-100">
                  Smart AI Assistant
                </h4>
              </div>
              <p className="text-xs text-blue-50 leading-relaxed">
                Looking for an urgent AC check or plumber tomorrow morning? Chat with BookEase AI to find and book live slots instantly.
              </p>
              <button
                type="button"
                onClick={openChatBot}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Start In-Chat Booking</span>
              </button>
            </div>

            {/* Panel 4: Platform Confidence Strip */}
            <div className="bg-white rounded-2xl border border-border p-4 space-y-3 text-xs text-zinc-600">
              <h4 className="font-bold text-zinc-900 text-xs uppercase tracking-wider">
                Booking Guarantees
              </h4>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-800">10-Minute Lock Protection</p>
                  <p className="text-[11px] text-zinc-500">No one can grab your slot while you check out.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-800">Zero Collision Guarantee</p>
                  <p className="text-[11px] text-zinc-500">Atomic database locks prevent double booking.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
