const mongoose = require('mongoose');
const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 500, min: 0 },
  description: { type: String, trim: true, maxlength: 500 },
  category: {
    type: String,
    enum: [
      'plumbing', 'salon', 'cleaning', 'electrician',
      'tutor', 'appliance-repair', 'painting', 'carpentry', 'other'
    ]
  },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Service', serviceSchema);

