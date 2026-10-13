const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const {
  createReview,
  getVendorReviews,
  getVendorRatingSummary,
  getMyReviews,
  getVendorOwnReviews
} = require('../controllers/review.controller');

// Public: get reviews and rating summary for a vendor
router.get('/vendor/:vendorId', getVendorReviews);
router.get('/vendor/:vendorId/summary', getVendorRatingSummary);

// Customer: write a review and view own reviews
router.post('/', protect, authorize('customer'), createReview);
router.get('/me', protect, authorize('customer'), getMyReviews);

// Vendor: see reviews about them
router.get('/vendor-dashboard', protect, authorize('vendor'), getVendorOwnReviews);

module.exports = router;
