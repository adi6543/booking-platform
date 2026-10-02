const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  vendorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  serviceId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  startTime:     { type: Date, required: true },
  endTime:       { type: Date, required: true },
  status:        { type: String, enum: ['available', 'reserved', 'booked'], default: 'available' },
  isBlocked:     { type: Boolean, default: false },
  blockedReason: { type: String },
  blockedUntil:  { type: Date }
}, { timestamps: true });

// Compound indexes for fast lookup and double-booking guard
slotSchema.index({ vendorId: 1, serviceId: 1, status: 1, isBlocked: 1 });
slotSchema.index({ vendorId: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Slot', slotSchema);
