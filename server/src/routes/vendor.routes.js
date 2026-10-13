const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const {
  getVendorProfile,
  updateVendorProfile,
  listVendors,
  getVendorDashboardStats
} = require('../controllers/vendor.controller');

// Public: list all vendors (with filters)
router.get('/', listVendors);

// Vendor: update own profile (must be before /:id)
router.put('/profile', protect, authorize('vendor'), updateVendorProfile);

// Vendor: dashboard stats (must be before /:id)
router.get('/dashboard/stats', protect, authorize('vendor'), getVendorDashboardStats);

// Public: get single vendor profile (keep last — /:id is a catch-all param)
router.get('/:id', getVendorProfile);

module.exports = router;
