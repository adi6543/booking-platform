const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  slotId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Slot',    required: true },
  customerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  vendorId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  serviceId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  status:            { type: String, enum: ['pending', 'confirmed', 'cancelled', 'failed'], default: 'pending' },
  paymentStatus:     { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  amount:            { type: Number },
  currency:          { type: String, default: 'INR' },
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  expiresAt:         { type: Date }
}, { timestamps: true });

/**
 * DOUBLE-BOOKING PREVENTION — Partial Unique Index
 *
 * Covers bookings with status in ['pending', 'confirmed'].
 * Prevents concurrent holds and double-bookings on the same slot.
 * Cancelled or failed bookings drop out of the partial index filter,
 * immediately freeing the slot for other customers.
 */
bookingSchema.index(
  { slotId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
);

bookingSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
