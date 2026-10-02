const VendorAvailability = require('../models/VendorAvailability');
const BlackoutDate = require('../models/BlackoutDate');
const Slot = require('../models/Slot');
const Service = require('../models/Service');
const User = require('../models/User');
const {
  generateSlotsForPattern,
  generateSlotsForVendor,
  removeUnbookedSlotsForBlackout
} = require('../utils/slotGenerator');

// ─── GET /api/vendor/availability ─────────────────────────────────────────────
const getVendorAvailability = async (req, res, next) => {
  try {
    const list = await VendorAvailability.find({ vendorId: req.user._id })
      .populate('serviceId', 'name price')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) { next(err); }
};

// ─── POST /api/vendor/availability ────────────────────────────────────────────
// Create or update a recurring weekly schedule for a service
const saveVendorAvailability = async (req, res, next) => {
  try {
    const {
      serviceId,
      daysOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      effectiveFrom,
      effectiveUntil
    } = req.body;

    if (!serviceId) {
      return res.status(400).json({ message: 'serviceId is required' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (String(service.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this service' });
    }

    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return res.status(400).json({ message: 'daysOfWeek must be a non-empty array of days (0-6)' });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'startTime and endTime are required (HH:mm format)' });
    }

    const duration = Number(slotDurationMinutes) >= 15 ? Number(slotDurationMinutes) : 60;

    // Upsert pattern for this vendor & service
    const pattern = await VendorAvailability.findOneAndUpdate(
      { vendorId: req.user._id, serviceId },
      {
        vendorId: req.user._id,
        serviceId,
        daysOfWeek: daysOfWeek.map(Number),
        startTime,
        endTime,
        slotDurationMinutes: duration,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('serviceId', 'name price');

    // On-demand: immediately generate slots for next 14 days
    const genResult = await generateSlotsForPattern(pattern, 14);

    res.status(200).json({
      pattern,
      generatedSlots: genResult.createdCount,
      skippedSlots: genResult.skippedCount,
      message: `Weekly schedule saved. Auto-generated ${genResult.createdCount} slots for the next 14 days.`
    });
  } catch (err) { next(err); }
};

// ─── DELETE /api/vendor/availability/:id ──────────────────────────────────────
const deleteVendorAvailability = async (req, res, next) => {
  try {
    const pattern = await VendorAvailability.findById(req.params.id);
    if (!pattern) return res.status(404).json({ message: 'Schedule pattern not found' });
    if (String(pattern.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pattern.deleteOne();
    res.json({ message: 'Recurring schedule removed' });
  } catch (err) { next(err); }
};

// ─── POST /api/vendor/availability/generate ───────────────────────────────────
// On-demand trigger to refresh/generate slots across all vendor patterns for next 14 days
const generateSlotsOnDemand = async (req, res, next) => {
  try {
    const result = await generateSlotsForVendor(req.user._id, 14);
    res.json({
      message: `Generated ${result.totalCreated} new slots for the next 14 days (${result.totalSkipped} existing/booked slots preserved).`,
      totalCreated: result.totalCreated,
      totalSkipped: result.totalSkipped
    });
  } catch (err) { next(err); }
};

// ─── Blackout Dates ───────────────────────────────────────────────────────────
const getVendorBlackouts = async (req, res, next) => {
  try {
    const blackouts = await BlackoutDate.find({ vendorId: req.user._id }).sort({ date: 1 });
    res.json(blackouts);
  } catch (err) { next(err); }
};

const addVendorBlackout = async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Valid date in YYYY-MM-DD format is required' });
    }

    const blackout = await BlackoutDate.findOneAndUpdate(
      { vendorId: req.user._id, date },
      { vendorId: req.user._id, date, reason: reason?.trim() || 'Shop closed' },
      { upsert: true, new: true }
    );

    // Remove unbooked available slots on this date
    const removedCount = await removeUnbookedSlotsForBlackout(req.user._id, date);

    res.status(201).json({
      blackout,
      removedSlots: removedCount,
      message: `Date ${date} marked as closed. Removed ${removedCount} unbooked slots.`
    });
  } catch (err) { next(err); }
};

const deleteVendorBlackout = async (req, res, next) => {
  try {
    const blackout = await BlackoutDate.findById(req.params.id);
    if (!blackout) return res.status(404).json({ message: 'Blackout date not found' });
    if (String(blackout.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await blackout.deleteOne();

    // Re-generate slots for rolling window to restore previously blacked out day
    const genResult = await generateSlotsForVendor(req.user._id, 14);

    res.json({
      message: `Closure for ${blackout.date} removed. Re-generated ${genResult.totalCreated} slots.`,
      regeneratedSlots: genResult.totalCreated
    });
  } catch (err) { next(err); }
};

// ─── Feature 2: "Busy Right Now" & Slot Blocking ─────────────────────────────

// Block or unblock an individual slot
const toggleBlockSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked = true, reason } = req.body;

    const slot = await Slot.findById(id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (String(slot.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this slot' });
    }

    if (slot.status === 'booked') {
      return res.status(400).json({ message: 'Cannot block an already booked slot' });
    }

    slot.isBlocked = !!isBlocked;
    slot.blockedReason = isBlocked ? (reason || 'Walk-in customer') : undefined;
    slot.blockedUntil = undefined;
    await slot.save();

    res.json({
      slot,
      message: isBlocked ? 'Slot blocked for walk-in/offline customer' : 'Slot unblocked and available'
    });
  } catch (err) { next(err); }
};

// Quick Pause for next N minutes (e.g. 30, 60, 120 minutes)
const quickPause = async (req, res, next) => {
  try {
    const minutes = Number(req.body.minutes) > 0 ? Number(req.body.minutes) : 60;
    const reason  = req.body.reason?.trim() || 'Walk-in customer / Offline pause';

    const now = new Date();
    const pauseUntil = new Date(now.getTime() + minutes * 60 * 1000);

    // 1. Record vendor-level pause status
    await User.findByIdAndUpdate(req.user._id, {
      pauseUntil,
      pauseReason: reason
    });

    // 2. Find and block all available unbooked slots overlapping with [now, pauseUntil]
    const result = await Slot.updateMany(
      {
        vendorId: req.user._id,
        status: 'available',
        startTime: { $lt: pauseUntil },
        endTime:   { $gt: now }
      },
      {
        $set: {
          isBlocked: true,
          blockedReason: reason,
          blockedUntil: pauseUntil
        }
      }
    );

    res.json({
      paused: true,
      minutes,
      pauseUntil,
      blockedCount: result.modifiedCount,
      message: `Paused for ${minutes} minutes. ${result.modifiedCount} upcoming slots blocked from online booking until ${pauseUntil.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`
    });
  } catch (err) { next(err); }
};

// Quick Resume / Unpause
const quickResume = async (req, res, next) => {
  try {
    // 1. Clear vendor-level pause status
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { pauseUntil: 1, pauseReason: 1 }
    });

    // 2. Unblock any slots currently blocked
    const result = await Slot.updateMany(
      {
        vendorId: req.user._id,
        isBlocked: true,
        status: 'available'
      },
      {
        $set: { isBlocked: false },
        $unset: { blockedReason: 1, blockedUntil: 1 }
      }
    );

    res.json({
      resumed: true,
      unblockedCount: result.modifiedCount,
      message: `Resumed availability. ${result.modifiedCount} slots are now back online for booking.`
    });
  } catch (err) { next(err); }
};

// Get current pause status
const getPauseStatus = async (req, res, next) => {
  try {
    const now = new Date();
    const vendor = await User.findById(req.user._id).select('pauseUntil pauseReason');

    const activePauseSlot = await Slot.findOne({
      vendorId: req.user._id,
      isBlocked: true,
      blockedUntil: { $gt: now }
    }).sort({ blockedUntil: -1 });

    const totalBlockedCount = await Slot.countDocuments({
      vendorId: req.user._id,
      isBlocked: true,
      status: 'available'
    });

    const isUserPaused = vendor?.pauseUntil && new Date(vendor.pauseUntil) > now;
    const isSlotPaused = !!activePauseSlot;

    if (isUserPaused || isSlotPaused) {
      res.json({
        isPaused: true,
        pauseUntil: vendor?.pauseUntil || activePauseSlot?.blockedUntil,
        reason: vendor?.pauseReason || activePauseSlot?.blockedReason || 'Walk-in customer',
        blockedCount: totalBlockedCount
      });
    } else {
      res.json({
        isPaused: false,
        blockedCount: totalBlockedCount
      });
    }
  } catch (err) { next(err); }
};

module.exports = {
  getVendorAvailability,
  saveVendorAvailability,
  deleteVendorAvailability,
  generateSlotsOnDemand,
  getVendorBlackouts,
  addVendorBlackout,
  deleteVendorBlackout,
  toggleBlockSlot,
  quickPause,
  quickResume,
  getPauseStatus
};
