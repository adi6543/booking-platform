const Booking = require('../models/Booking');
const Slot = require('../models/Slot');

/**
 * Release pending holds that have expired past their 10-minute window,
 * and automatically unblock slots whose walk-in pause window has passed.
 */
const releaseExpiredHolds = async () => {
  try {
    const now = new Date();

    // 1. Release expired checkout holds
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

    // 2. Automatically unblock slots whose temporary walk-in pause has expired
    await Slot.updateMany(
      {
        isBlocked: true,
        blockedUntil: { $lte: now }
      },
      {
        $set: { isBlocked: false },
        $unset: { blockedUntil: 1, blockedReason: 1 }
      }
    );

    return expiredBookings.length;
  } catch (err) {
    console.error('Error in releaseExpiredHolds:', err);
    return 0;
  }
};

module.exports = { releaseExpiredHolds };
