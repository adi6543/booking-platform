const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  vendorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  serviceId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  startTime:  { type: Date, required: true },
  endTime:    { type: Date, required: true },
  status:     { type: String, enum: ['available', 'reserved', 'booked'], default: 'available' }
}, { timestamps: true });

// Compound index for fast lookups by vendor+service+status (used in getSlots)
slotSchema.index({ vendorId: 1, serviceId: 1, status: 1 });

module.exports = mongoose.model('Slot', slotSchema);
