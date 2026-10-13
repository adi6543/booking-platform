const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { releaseExpiredHolds } = require('../utils/bookingCleanup');

// ─── POST /api/slots ─────────────────────────────────────────────────────────
// Vendor creates available slots for one of their services.
// Ownership check: service must belong to the requesting vendor.
const createSlot = async (req, res, next) => {
  try {
    const { serviceId, startTime, endTime } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (String(service.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to create slots for this service' });
    }

    // Validate time ordering
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }

    const slot = await Slot.create({
      vendorId: req.user._id,
      serviceId,
      startTime,
      endTime
    });
    res.status(201).json(slot);
  } catch (err) { next(err); }
};

// ─── GET /api/slots?vendorId=&serviceId= ─────────────────────────────────────
// Public: list available slots, optionally filtered by vendorId / serviceId.
// Excludes any slots blocked by walk-ins or offline pauses.
const getSlots = async (req, res, next) => {
  try {
    await releaseExpiredHolds();
    const { vendorId, serviceId } = req.query;
    const filter = { status: 'available', isBlocked: { $ne: true } };
    if (vendorId)   filter.vendorId   = vendorId;
    if (serviceId)  filter.serviceId  = serviceId;

    const slots = await Slot.find(filter)
      .populate('serviceId', 'name price description category')
      .populate('vendorId', 'name businessName city area category phone')
      .sort({ startTime: 1 });
    res.json(slots);
  } catch (err) { next(err); }
};

// ─── GET /api/slots/vendor — vendor sees all their own slots ─────────────────
const getVendorSlots = async (req, res, next) => {
  try {
    await releaseExpiredHolds();
    const { serviceId } = req.query;
    const filter = { vendorId: req.user._id };
    if (serviceId) filter.serviceId = serviceId;

    const slots = await Slot.find(filter)
      .populate('serviceId', 'name price')
      .sort({ startTime: 1 });
    res.json(slots);
  } catch (err) { next(err); }
};

// ─── DELETE /api/slots/:id — vendor deletes an available (unbooked) slot ─────
const deleteSlot = async (req, res, next) => {
  try {
    await releaseExpiredHolds();
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (String(slot.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this slot' });
    }
    if (slot.status !== 'available') {
      return res.status(400).json({ message: 'Cannot delete a booked or reserved slot' });
    }
    await slot.deleteOne();
    res.json({ message: 'Slot deleted' });
  } catch (err) { next(err); }
};

// ─── POST /api/bookings ───────────────────────────────────────────────────────
// Customer books a slot (creates pending booking with 10-minute hold window).
// Double-booking guard: partial unique index on (slotId) WHERE status IN ('pending', 'confirmed').
// Only when payment is verified (via /verify or webhook) does status flip to 'confirmed'
// and paymentStatus to 'paid'.
const bookSlot = async (req, res, next) => {
  try {
    await releaseExpiredHolds();
    const { slotId } = req.body;

    // Verify slot exists
    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });

    // Reject if slot is currently blocked by walk-in or offline pause
    if (slot.isBlocked) {
      return res.status(409).json({ message: 'This slot is currently blocked by the vendor (walk-in customer or temporary pause)' });
    }

    // Soft pre-check: reject if slot is already reserved or booked
    if (slot.status !== 'available') {
      return res.status(409).json({ message: 'Slot is already booked or reserved' });
    }

    const service = await Service.findById(slot.serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found for this slot' });

    const amount = (service.price !== undefined ? service.price : 500) * 100; // in paise
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-min hold

    // Attempt the Booking insert — partial unique index rejects concurrent holds (11000)
    let booking;
    try {
      booking = await Booking.create({
        slotId,
        customerId:    req.user._id,
        vendorId:      slot.vendorId,
        serviceId:     slot.serviceId,
        amount,
        currency:      'INR',
        status:        'pending',
        paymentStatus: 'pending',
        expiresAt
      });
    } catch (dbError) {
      if (dbError.code === 11000) {
        return res.status(409).json({ message: 'Slot is already booked or reserved (concurrent request)' });
      }
      throw dbError;
    }

    // Atomically flip slot status to 'reserved' ensuring it was not blocked or reserved in parallel
    const reservedSlot = await Slot.findOneAndUpdate(
      { _id: slotId, status: 'available', isBlocked: { $ne: true } },
      { status: 'reserved' }
    );
    if (!reservedSlot) {
      await booking.deleteOne();
      return res.status(409).json({ message: 'Slot was reserved or blocked by the vendor during checkout initiation' });
    }

    const populated = await booking.populate('slotId serviceId vendorId', '-password');
    res.status(201).json(populated);
  } catch (err) { next(err); }
};

// ─── GET /api/bookings/me ─────────────────────────────────────────────────────
const getMyBookings = async (req, res, next) => {
  try {
    await releaseExpiredHolds();
    const bookings = await Booking.find({ customerId: req.user._id })
      .populate('slotId', 'startTime endTime status')
      .populate('serviceId', 'name price')
      .populate('vendorId', 'name email')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { next(err); }
};

// ─── GET /api/vendor/bookings ─────────────────────────────────────────────────
const getVendorBookings = async (req, res, next) => {
  try {
    await releaseExpiredHolds();
    const bookings = await Booking.find({ vendorId: req.user._id })
      .populate('slotId', 'startTime endTime status')
      .populate('serviceId', 'name price')
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { next(err); }
};

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────
// Cancel a booking (customer who booked OR vendor who owns the service).
// Freeing the slot: sets slot.status back to 'available' AND cancels the
// booking. Because the partial index only covers status IN ['pending', 'confirmed'],
// the slot is immediately re-bookable after cancellation.
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isCustomer = String(booking.customerId) === String(req.user._id);
    const isVendor   = String(booking.vendorId)   === String(req.user._id);

    if (!isCustomer && !isVendor) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    // 1. Cancel the booking and mark paymentStatus failed if unpaid
    booking.status = 'cancelled';
    if (booking.paymentStatus === 'pending') {
      booking.paymentStatus = 'failed';
    }
    await booking.save();

    // 2. Free the slot — atomically
    await Slot.findByIdAndUpdate(booking.slotId, { status: 'available' });

    const populated = await Booking.findById(booking._id)
      .populate('slotId', 'startTime endTime status')
      .populate('serviceId', 'name price')
      .populate('vendorId', 'name email')
      .populate('customerId', 'name email');

    res.json({ message: 'Booking cancelled successfully', booking: populated });
  } catch (err) { next(err); }
};

module.exports = {
  createSlot, getSlots, getVendorSlots, deleteSlot,
  bookSlot, getMyBookings, getVendorBookings, cancelBooking
};
