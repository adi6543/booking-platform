const Booking = require('../models/Booking');
const Slot = require('../models/Slot');

/**
 * Release pending holds that have expired past their 10-minute window.
 * This ensures abandoned checkouts immediately return slots to 'available'.
 */
const releaseExpiredHolds = async () => {
  try {
    const now = new Date();
    const expiredBookings = await Booking.find({
      status: 'pending',
      paymentStatus: 'pending',
      expiresAt: { $lt: now }
    });

    for (const booking of expiredBookings) {
      booking.status = 'failed';
      booking.paymentStatus = 'failed';
      await booking.save();
      await Slot.findByIdAndUpdate(booking.slotId, { status: 'available' });
    }

    return expiredBookings.length;
  } catch (err) {
    console.error('Error in releaseExpiredHolds:', err);
    return 0;
  }
};

module.exports = { releaseExpiredHolds };
