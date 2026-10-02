const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const {
  getVendorAvailability,
  saveVendorAvailability,
  deleteVendorAvailability,
  generateSlotsOnDemand,
  getVendorBlackouts,
  addVendorBlackout,
  deleteVendorBlackout,
  toggleBlockSlot,
  quickPause,
  quickResume,
  getPauseStatus
} = require('../controllers/availability.controller');

// ── Feature 1: Recurring weekly schedules ─────────────────────────────────────
router.get('/vendor/availability',          protect, authorize('vendor'), getVendorAvailability);
router.post('/vendor/availability',         protect, authorize('vendor'), saveVendorAvailability);
router.delete('/vendor/availability/:id',   protect, authorize('vendor'), deleteVendorAvailability);
router.post('/vendor/availability/generate',protect, authorize('vendor'), generateSlotsOnDemand);

// ── Blackout dates (Closures / Holidays) ──────────────────────────────────────
router.get('/vendor/blackouts',             protect, authorize('vendor'), getVendorBlackouts);
router.post('/vendor/blackouts',            protect, authorize('vendor'), addVendorBlackout);
router.delete('/vendor/blackouts/:id',      protect, authorize('vendor'), deleteVendorBlackout);

// ── Feature 2: "Busy Right Now" & Slot Blocking ──────────────────────────────
router.patch('/slots/:id/block',            protect, authorize('vendor'), toggleBlockSlot);
router.post('/vendor/pause',                protect, authorize('vendor'), quickPause);
router.post('/vendor/resume',               protect, authorize('vendor'), quickResume);
router.get('/vendor/pause-status',          protect, authorize('vendor'), getPauseStatus);

module.exports = router;
