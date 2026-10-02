const mongoose = require('mongoose');

const vendorAvailabilitySchema = new mongoose.Schema({
  vendorId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  serviceId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  daysOfWeek:          { type: [Number], required: true }, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime:           { type: String, required: true },   // "HH:mm", e.g. "09:00"
  endTime:             { type: String, required: true },   // "HH:mm", e.g. "18:00"
  slotDurationMinutes: { type: Number, required: true, default: 60, min: 15 },
  effectiveFrom:       { type: Date, default: Date.now },
  effectiveUntil:      { type: Date },
  isActive:            { type: Boolean, default: true }
}, { timestamps: true });

vendorAvailabilitySchema.index({ vendorId: 1, serviceId: 1 });

module.exports = mongoose.model('VendorAvailability', vendorAvailabilitySchema);
