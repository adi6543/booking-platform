const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  createOrder,
  verifyPayment,
  handleWebhook,
  cancelPayment
} = require('../controllers/payment.controller');

// Customer-only endpoints (protected by JWT auth)
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/cancel', protect, cancelPayment);

// Webhook endpoint (invoked by Razorpay servers; signature verified cryptographically)
router.post('/webhook', handleWebhook);

module.exports = router;
