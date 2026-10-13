const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const Slot = require('../models/Slot');

const CATEGORY_KEYWORDS = {
  plumbing: ['plumb', 'pipe', 'leak', 'tap', 'drain', 'basin', 'bathroom', 'flush', 'water', 'faucet'],
  salon: ['salon', 'hair', 'haircut', 'facial', 'grooming', 'bridal', 'makeup', 'wax', 'spa', 'massage', 'beauty'],
  cleaning: ['clean', 'cleaning', 'deep clean', 'maid', 'sofa', 'carpet', 'kitchen clean', 'dust', 'housekeep'],
  electrician: ['electric', 'wiring', 'switch', 'light', 'fan', 'mcb', 'power', 'fuse', 'socket', 'short circuit'],
  tutor: ['tutor', 'tuition', 'teach', 'math', 'science', 'english', 'exam', 'class', 'study', 'student', 'yoga', 'trainer', 'fitness'],
  'appliance-repair': ['appliance', 'ac', 'air condition', 'air conditioner', 'fridge', 'refrigerator', 'washing machine', 'microwave', 'oven', 'cooler', 'laptop', 'phone', 'repair', 'techfix'],
  painting: ['paint', 'painting', 'wall', 'primer', 'color', 'whitewash'],
  carpentry: ['carpenter', 'carpentry', 'wood', 'furniture', 'door', 'cupboard', 'table', 'chair', 'drawer']
};

const CATEGORY_NAMES = {
  plumbing: 'Plumbing',
  salon: 'Salon & Grooming',
  cleaning: 'Home Cleaning',
  electrician: 'Electrician',
  tutor: 'Home Tutor & Fitness',
  'appliance-repair': 'Appliance Repair',
  painting: 'Painting',
  carpentry: 'Carpentry'
};

function formatSlotDate(d) {
  const date = new Date(d);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

function formatSlotTime(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// POST /api/chat — Intelligent Assistant with Live Slot & Database Search
router.post('/', async (req, res, next) => {
  try {
    const { message = '' } = req.body;
    const text = (message || '').trim().toLowerCase();

    if (!text) {
      return res.json({
        reply: "Hello! I'm your BookEase Assistant. How can I help you today? You can ask me to find services, check live available slots (e.g., *'ac service'*, *'plumber tomorrow'*), or explain bookings & payments.",
        suggestions: [
          'Slots for AC service 🔨',
          'Find a plumber 🔧',
          'Need an electrician ⚡',
          'How does booking work? 📅'
        ]
      });
    }

    // ── 1. Greeting ──
    if (/^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening)|hola|yo)\b/i.test(text)) {
      return res.json({
        reply: "Hello! Welcome to BookEase. I can look up live available slots in real-time, find verified neighbourhood experts (AC repair, plumbing, salon, cleaners, electricians), or guide you through instant booking. What service do you need today?",
        suggestions: [
          'Slots for AC service 🔨',
          'Find a plumber 🔧',
          'Deep cleaning services 🧹',
          'How does booking work? 📅'
        ]
      });
    }

    // ── 2. How Booking Works ──
    if (/how.*(book|reserve|work)|booking (process|step|flow|works)|steps to book/i.test(text) && !/slot|service/i.test(text)) {
      return res.json({
        reply: "Booking an appointment on BookEase is fast and seamless:\n\n1. **Pick a Service**: Filter by category, vendor, or search keywords on our Browse page.\n2. **Select a Live Slot**: Choose your preferred day and time from real-time calendar availability.\n3. **10-Min Reserved Hold**: Complete simulated or live payment to confirm your spot.\n4. **Instant Confirmation**: View your confirmed appointment and receipts under **My Bookings** anytime!",
        actions: [
          { label: 'Browse Live Slots →', url: '/browse' }
        ],
        suggestions: ['Slots for AC service 🔨', 'Find a plumber 🔧', 'Payment options 💳']
      });
    }

    // ── 3. Payment & Hold Policy ──
    if (/(payment|pay|hold|refund|charge|upi|card|razorpay|cost|fee)/i.test(text) && !/(find|slot|book|service|repair)/i.test(text)) {
      return res.json({
        reply: "Here's how payments work on BookEase:\n\n• **10-Minute Hold**: When you select an available slot, it's reserved exclusively for you for 10 minutes so no one else can take it.\n• **Secure Checkout**: We process payments via Razorpay supporting UPI, credit/debit cards, and netbanking.\n• **Sandbox / Simulation**: Built-in simulated payments let you test booking without real money.\n• **Refunds**: If you cancel prior to appointment confirmation or within the cancellation window, slot holds are instantly released.",
        actions: [
          { label: 'Browse Services', url: '/browse' },
          { label: 'View My Bookings', url: '/my-bookings' }
        ],
        suggestions: ['Slots for AC service 🔨', 'How to cancel a booking? ❌', 'Find a service 🔍']
      });
    }

    // ── 4. Cancellation & Support ──
    if (/cancel|reschedule|change time|support|contact/i.test(text) && !/(slot|service|ac|plumb)/i.test(text)) {
      return res.json({
        reply: "Need to manage or cancel a booking?\n\n• Head to **My Bookings** in the top navigation.\n• Find the appointment and click the **Cancel** button.\n• Unpaid reservations expire automatically after 10 minutes, so there's no penalty.\n• For confirmed appointments, cancellations release slots back to the provider.",
        actions: [
          { label: 'Go to My Bookings', url: '/my-bookings' }
        ],
        suggestions: ['Browse services 🔍', 'Find a service 🔧']
      });
    }

    // ── 5. Vendor Registration / Vendor Features ──
    if (/register as.*vendor|become.*vendor|vendor signup|partner with us/i.test(text)) {
      return res.json({
        reply: "Are you a service professional? Join BookEase as a verified Vendor!\n\n• **Automated Scheduling**: Set weekly recurring schedules and let the system generate rolling 14-day booking slots.\n• **Walk-in Protection**: Use the 'Busy Right Now' toggle to temporarily pause incoming appointments.\n• **Vendor Dashboard**: Track daily bookings, revenue metrics, customer reviews, and edit your profile.\n• **Direct Payouts**: Secure payment tracking.",
        actions: [
          { label: 'Register as Vendor', url: '/signup' },
          { label: 'Vendor Dashboard', url: '/vendor/dashboard' }
        ],
        suggestions: ['How does booking work? 📅', 'Browse existing vendors 🏪']
      });
    }

    // ── 6. Intelligent Service & Slot Search ──
    // Extract category if matched
    let matchedCategory = null;
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const isMatch = keywords.some(k => {
        const regex = new RegExp(`(^|\\b|\\s)${k}(\\b|\\s|$)`, 'i');
        return regex.test(text);
      });
      if (isMatch) {
        matchedCategory = cat;
        break;
      }
    }

    // Clean text to extract search terms by removing common conversational words
    const cleanTokens = text
      .replace(/(\bac\b)/gi, '__AC__') // Preserve AC token
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .map(w => w === '__AC__' ? 'AC' : w)
      .filter(w => !['i', 'me', 'my', 'we', 'you', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'any', 'there', 'for', 'to', 'in', 'at', 'on', 'with', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'have', 'has', 'had', 'want', 'need', 'give', 'show', 'find', 'book', 'booking', 'look', 'looking', 'slot', 'slots', 'available', 'availability', 'please', 'tell', 'about', 'service', 'services', 'appointment', 'appointments', 'didnt', 'gave'].includes(w.toLowerCase()));

    const searchQuery = cleanTokens.join(' ').trim();
    const isAcQuery = /\bac\b/i.test(text) || text.includes('air condition');

    // Build specific name-match regex
    const nameMatchRegex = isAcQuery
      ? /\bac\b|air condition/i
      : (searchQuery ? new RegExp(`(^|\\b|\\s)${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|\\s|$)`, 'i') : null);

    // 1. Try finding services whose name directly matches the search query
    let directMatchingServices = [];
    if (nameMatchRegex) {
      directMatchingServices = await Service.find({ name: { $regex: nameMatchRegex } })
        .populate('vendorId', 'name businessName city area category')
        .limit(6);
    }

    // 2. If no direct name match or for category enrichment, search by category
    let categoryServices = [];
    if (matchedCategory) {
      categoryServices = await Service.find({ category: matchedCategory })
        .populate('vendorId', 'name businessName city area category')
        .limit(6);
    }

    // Merge and deduplicate, prioritizing direct name matches
    const serviceMap = new Map();
    for (const s of directMatchingServices) {
      serviceMap.set(String(s._id), s);
    }
    // Only add category services if we didn't get enough direct matches
    if (serviceMap.size === 0) {
      for (const s of categoryServices) {
        serviceMap.set(String(s._id), s);
      }
    }

    let matchingServices = Array.from(serviceMap.values());

    // Also look up vendor matches if no service directly matched
    if (matchingServices.length === 0 && searchQuery) {
      const matchingVendors = await User.find({
        role: 'vendor',
        $or: [
          { name: { $regex: new RegExp(searchQuery, 'i') } },
          { businessName: { $regex: new RegExp(searchQuery, 'i') } }
        ]
      }).limit(4);

      if (matchingVendors.length > 0) {
        matchingServices = await Service.find({
          vendorId: { $in: matchingVendors.map(v => v._id) }
        }).populate('vendorId', 'name businessName city area category').limit(6);
      }
    }

    // Check for slots!
    let matchingSlots = [];
    const now = new Date();

    if (matchingServices.length > 0) {
      const serviceIds = matchingServices.map(s => s._id);
      matchingSlots = await Slot.find({
        serviceId: { $in: serviceIds },
        status: 'available',
        isBlocked: false,
        startTime: { $gte: now }
      })
      .populate('serviceId', 'name price category')
      .populate('vendorId', 'name businessName city area')
      .sort({ startTime: 1 })
      .limit(5);
    } else if (text.includes('slot') || text.includes('available') || text.includes('today') || text.includes('tomorrow')) {
      // General slot query: fetch next upcoming available slots
      matchingSlots = await Slot.find({
        status: 'available',
        isBlocked: false,
        startTime: { $gte: now }
      })
      .populate('serviceId', 'name price category')
      .populate('vendorId', 'name businessName city area')
      .sort({ startTime: 1 })
      .limit(5);
    }

    // If slots are found, respond with the exact live slots!
    if (matchingSlots.length > 0) {
      const primaryService = matchingSlots[0].serviceId?.name || 'Service';
      const slotLines = matchingSlots.map(s => {
        const dateLabel = formatSlotDate(s.startTime);
        const timeLabel = `${formatSlotTime(s.startTime)} – ${formatSlotTime(s.endTime)}`;
        const vName = s.vendorId?.businessName || s.vendorId?.name || 'Verified Vendor';
        const sName = s.serviceId?.name || primaryService;
        const price = s.serviceId?.price ? `₹${s.serviceId.price}` : '';
        const loc = [s.vendorId?.area, s.vendorId?.city].filter(Boolean).join(', ');
        return `• **${sName}** (${price})\n  📅 **${dateLabel}**, ${timeLabel}\n  🏪 *${vName}*${loc ? ` (${loc})` : ''}`;
      }).join('\n\n');

      const browseSearchTerm = primaryService;
      const browseUrl = `/browse?search=${encodeURIComponent(browseSearchTerm)}`;

      const slotPayload = matchingSlots.map(s => ({
        id: String(s._id),
        serviceName: s.serviceId?.name || primaryService,
        price: s.serviceId?.price,
        vendorName: s.vendorId?.businessName || s.vendorId?.name,
        date: formatSlotDate(s.startTime),
        time: `${formatSlotTime(s.startTime)} – ${formatSlotTime(s.endTime)}`,
        browseUrl
      }));

      return res.json({
        reply: `Yes! I found **${matchingSlots.length} available upcoming slots** in our database:\n\n${slotLines}\n\nClick below to book your appointment right now:`,
        slots: slotPayload,
        actions: [
          { label: `Book ${primaryService} Now →`, url: browseUrl },
          { label: 'Browse All Slots', url: '/browse' }
        ],
        suggestions: [
          'How does booking work? 📅',
          'Payment & Refunds 💳',
          'Need another service 🔍'
        ]
      });
    }

    // If services matched but no slots currently open
    if (matchingServices.length > 0) {
      const s = matchingServices[0];
      const vName = s.vendorId?.businessName || s.vendorId?.name || 'Verified Provider';
      const catDisplayName = matchedCategory ? CATEGORY_NAMES[matchedCategory] : s.name;

      return res.json({
        reply: `I found **${matchingServices.length} service listings** for ${catDisplayName} (including **${s.name}** by *${vName}* at ₹${s.price}), but all slots are currently reserved or waiting for the vendor to publish new timings.\n\nYou can visit the Browse page to check all available categories or contact the provider directly.`,
        actions: [
          { label: `Search ${s.name} on Browse`, url: `/browse?search=${encodeURIComponent(s.name)}` },
          { label: 'Browse All Services', url: '/browse' }
        ],
        suggestions: [
          'Find a plumber 🔧',
          'Home cleaning 🧹',
          'How does booking work? 📅'
        ]
      });
    }

    // ── 7. General Fallback ──
    res.json({
      reply: `I couldn't find matching live slots for "${message}". You can browse all categories like **AC Servicing**, **Plumbing**, **Home Cleaning**, and **Electricians** directly on our Browse page!`,
      actions: [
        { label: 'Browse All Services & Slots →', url: '/browse' }
      ],
      suggestions: [
        'Slots for AC service 🔨',
        'Find a plumber 🔧',
        'Electrician repair ⚡',
        'Home cleaning 🧹'
      ]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
