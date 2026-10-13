const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',  required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  vendorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  serviceId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Service',  required: true },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  comment:    { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

// One review per booking
reviewSchema.index({ bookingId: 1 }, { unique: true });
// Fast lookup: all reviews for a vendor
reviewSchema.index({ vendorId: 1, createdAt: -1 });
// Fast lookup: average rating aggregation per vendor
reviewSchema.index({ vendorId: 1, rating: 1 });

module.exports = mongoose.model('Review', reviewSchema);
