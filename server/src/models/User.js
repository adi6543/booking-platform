const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['customer', 'vendor'],
    required: true,
  },
  // Vendor profile fields
  phone: {
    type: String,
    trim: true,
  },
  businessName: {
    type: String,
    trim: true,
  },
  businessDescription: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  category: {
    type: String,
    enum: [
      'plumbing', 'salon', 'cleaning', 'electrician',
      'tutor', 'appliance-repair', 'painting', 'carpentry', 'other'
    ],
  },
  city: {
    type: String,
    trim: true,
  },
  area: {
    type: String,
    trim: true,
  },
  pinCode: {
    type: String,
    trim: true,
  },
  pauseUntil: {
    type: Date,
  },
  pauseReason: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
