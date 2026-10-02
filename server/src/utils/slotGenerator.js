const Slot = require('../models/Slot');
const VendorAvailability = require('../models/VendorAvailability');
const BlackoutDate = require('../models/BlackoutDate');

/**
 * Format a Date to "YYYY-MM-DD"
 */
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse "HH:mm" on a given base date (local calendar time)
 */
function parseTimeOnDate(baseDate, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(h, m, 0, 0);
  return result;
}

/**
 * Generate slots for a single VendorAvailability pattern over rolling window
 */
async function generateSlotsForPattern(availability, daysAhead = 14) {
  const { vendorId, serviceId, daysOfWeek, startTime, endTime, slotDurationMinutes, effectiveFrom, effectiveUntil } = availability;

  // Retrieve vendor's blackout dates
  const blackouts = await BlackoutDate.find({ vendorId }).select('date').lean();
  const blackoutSet = new Set(blackouts.map(b => b.date));

  const now = new Date();
  const durationMs = slotDurationMinutes * 60 * 1000;
  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < daysAhead; i++) {
    const currentDay = new Date();
    currentDay.setDate(now.getDate() + i);
    currentDay.setHours(0, 0, 0, 0);

    const dateKey = formatDateKey(currentDay);

    // Skip blackout dates
    if (blackoutSet.has(dateKey)) {
      continue;
    }

    // Check effective date boundaries
    if (effectiveFrom && currentDay < new Date(new Date(effectiveFrom).setHours(0, 0, 0, 0))) {
      continue;
    }
    if (effectiveUntil && currentDay > new Date(new Date(effectiveUntil).setHours(23, 59, 59, 999))) {
      continue;
    }

    // Check active day of week (0 = Sunday ... 6 = Saturday)
    const dayOfWeek = currentDay.getDay();
    if (!daysOfWeek.includes(dayOfWeek)) {
      continue;
    }

    const dayWindowStart = parseTimeOnDate(currentDay, startTime);
    const dayWindowEnd   = parseTimeOnDate(currentDay, endTime);

    let slotCursor = new Date(dayWindowStart);

    while (slotCursor.getTime() + durationMs <= dayWindowEnd.getTime()) {
      const slotStart = new Date(slotCursor);
      const slotEnd   = new Date(slotCursor.getTime() + durationMs);

      slotCursor = new Date(slotEnd);

      // Never generate slots in the past
      if (slotStart <= now) {
        continue;
      }

      // Check if slot already exists
      const existing = await Slot.findOne({
        vendorId,
        serviceId,
        startTime: slotStart,
        endTime: slotEnd
      });

      if (existing) {
        skippedCount++;
        continue; // Protect booked, reserved, and existing slots
      }

      // Create new available slot
      await Slot.create({
        vendorId,
        serviceId,
        startTime: slotStart,
        endTime: slotEnd,
        status: 'available',
        isBlocked: false
      });
      createdCount++;
    }
  }

  return { createdCount, skippedCount };
}

/**
 * Generate slots for all active patterns of a vendor
 */
async function generateSlotsForVendor(vendorId, daysAhead = 14) {
  const patterns = await VendorAvailability.find({ vendorId, isActive: true });
  let totalCreated = 0;
  let totalSkipped = 0;

  for (const pattern of patterns) {
    const res = await generateSlotsForPattern(pattern, daysAhead);
    totalCreated += res.createdCount;
    totalSkipped += res.skippedCount;
  }

  return { totalCreated, totalSkipped };
}

/**
 * Remove unbooked available slots on a newly added blackout date
 */
async function removeUnbookedSlotsForBlackout(vendorId, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endOfDay   = new Date(y, m - 1, d, 23, 59, 59, 999);

  const result = await Slot.deleteMany({
    vendorId,
    startTime: { $gte: startOfDay, $lte: endOfDay },
    status: 'available' // Never touch booked or reserved slots
  });

  return result.deletedCount;
}

/**
 * Scheduled rolling-window maintenance (runs daily)
 */
async function runScheduledSlotGeneration(daysAhead = 14) {
  const patterns = await VendorAvailability.find({ isActive: true });
  let grandTotal = 0;

  for (const pattern of patterns) {
    try {
      const res = await generateSlotsForPattern(pattern, daysAhead);
      grandTotal += res.createdCount;
    } catch (err) {
      console.error(`Error generating slots for pattern ${pattern._id}:`, err);
    }
  }

  return grandTotal;
}

module.exports = {
  generateSlotsForPattern,
  generateSlotsForVendor,
  removeUnbookedSlotsForBlackout,
  runScheduledSlotGeneration,
  formatDateKey
};
