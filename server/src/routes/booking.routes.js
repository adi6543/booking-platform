const express = require('express');
const router = express.Router();
const validate   = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { createSlotSchema, createBookingSchema } = require('../validations/booking.schema');
const {
  createSlot, getSlots, getVendorSlots, deleteSlot,
  bookSlot, getMyBookings, getVendorBookings, cancelBooking
} = require('../controllers/booking.controller');

// ── Slots ────────────────────────────────────────────────────────────────────
// POST   /api/slots            — vendor creates a slot for their own service
// GET    /api/slots            — public: list available slots (query: vendorId, serviceId)
// GET    /api/slots/vendor     — vendor sees ALL their slots (any status)
// DELETE /api/slots/:id        — vendor deletes an unbooked slot

router.post('/slots',         protect, authorize('vendor'), validate(createSlotSchema), createSlot);
router.get('/slots',          getSlots);                                                             // public
router.get('/slots/vendor',   protect, authorize('vendor'), getVendorSlots);
router.delete('/slots/:id',   protect, authorize('vendor'), deleteSlot);

// ── Bookings ─────────────────────────────────────────────────────────────────
// POST  /api/bookings             — customer books a slot
// GET   /api/bookings/me          — customer's own bookings
// GET   /api/vendor/bookings      — vendor's incoming bookings
// PATCH /api/bookings/:id/cancel  — cancel (customer who booked OR owning vendor)

router.post('/bookings',              protect, authorize('customer'), validate(createBookingSchema), bookSlot);
router.get('/bookings/me',            protect, authorize('customer'), getMyBookings);
router.get('/vendor/bookings',        protect, authorize('vendor'),   getVendorBookings);
router.patch('/bookings/:id/cancel',  protect,                        cancelBooking);

module.exports = router;
