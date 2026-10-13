const Review = require('../models/Review');
const Booking = require('../models/Booking');

// ─── POST /api/reviews ───────────────────────────────────────────────────────
// Customer writes a review for a confirmed (paid) booking.
const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ message: 'bookingId and rating (1-5) are required' });
    }
    if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (String(booking.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only review your own bookings' });
    }
    if (booking.status !== 'confirmed' || booking.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'You can only review confirmed and paid bookings' });
    }

    // Check if review already exists for this booking
    const existing = await Review.findOne({ bookingId });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this booking' });
    }

    const review = await Review.create({
      bookingId,
      customerId: req.user._id,
      vendorId: booking.vendorId,
      serviceId: booking.serviceId,
      rating: Number(rating),
      comment: comment?.trim() || undefined
    });

    const populated = await Review.findById(review._id)
      .populate('customerId', 'name')
      .populate('serviceId', 'name');

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this booking' });
    }
    next(err);
  }
};

// ─── GET /api/reviews/vendor/:vendorId ────────────────────────────────────────
// Public: get all reviews for a vendor (paginated)
const getVendorReviews = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ vendorId })
        .populate('customerId', 'name')
        .populate('serviceId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ vendorId })
    ]);

    res.json({
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) { next(err); }
};

// ─── GET /api/reviews/vendor/:vendorId/summary ───────────────────────────────
// Public: get average rating and count for a vendor
const getVendorRatingSummary = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const result = await Review.aggregate([
      { $match: { vendorId: require('mongoose').Types.ObjectId.createFromHexString(vendorId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    if (result.length === 0) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    }

    const data = result[0];
    res.json({
      averageRating: Math.round(data.averageRating * 10) / 10,
      totalReviews: data.totalReviews,
      breakdown: {
        5: data.rating5,
        4: data.rating4,
        3: data.rating3,
        2: data.rating2,
        1: data.rating1
      }
    });
  } catch (err) { next(err); }
};

// ─── GET /api/reviews/me ─────────────────────────────────────────────────────
// Customer: get all reviews they've written
const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ customerId: req.user._id })
      .populate('vendorId', 'name')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { next(err); }
};

// ─── GET /api/reviews/vendor-dashboard ────────────────────────────────────────
// Vendor: see all reviews about them
const getVendorOwnReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ vendorId: req.user._id })
      .populate('customerId', 'name')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { next(err); }
};

module.exports = {
  createReview,
  getVendorReviews,
  getVendorRatingSummary,
  getMyReviews,
  getVendorOwnReviews
};
