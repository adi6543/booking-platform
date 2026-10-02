const mongoose = require('mongoose');

const blackoutDateSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:     { type: String, required: true }, // Format "YYYY-MM-DD"
  reason:   { type: String, default: 'Shop closed' }
}, { timestamps: true });

blackoutDateSchema.index({ vendorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('BlackoutDate', blackoutDateSchema);
