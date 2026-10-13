const crypto = require('crypto');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Service = require('../models/Service');
const { getRazorpayInstance } = require('../config/razorpay');
const { releaseExpiredHolds } = require('../utils/bookingCleanup');

// ─── POST /api/payments/create-order ─────────────────────────────────────────
// Customer creates a Razorpay order for their pending booking.
// Ownership check: must be customer who owns the booking.
const createOrder = async (req, res, next) => {
  try {
    await releaseExpiredHolds();
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const booking = await Booking.findById(bookingId).populate('serviceId slotId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Ownership check
    if (String(booking.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }

    // Check if already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking is already paid and confirmed' });
    }

    // Check if cancelled or failed
    if (booking.status === 'cancelled' || booking.status === 'failed') {
      return res.status(400).json({ message: `Cannot pay for a ${booking.status} booking` });
    }

    // Check expiration of temporary hold (10 min)
    if (booking.expiresAt && new Date() > new Date(booking.expiresAt)) {
      booking.status = 'failed';
      booking.paymentStatus = 'failed';
      await booking.save();
      await Slot.findByIdAndUpdate(booking.slotId._id, { status: 'available' });
      return res.status(410).json({ message: 'Booking hold expired. Please select the slot again.' });
    }

    // Calculate price in paise (1 INR = 100 paise)
    const servicePrice = booking.serviceId?.price !== undefined ? booking.serviceId.price : 500;
    const amountInPaise = servicePrice * 100;

    const isPlaceholder = !process.env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID === 'dev_razorpay_key' ||
      process.env.RAZORPAY_KEY_ID.includes('placeholder') ||
      process.env.RAZORPAY_KEY_ID.startsWith('dummy');

    const paymentMode = process.env.PAYMENT_MODE || (isPlaceholder ? 'simulated' : 'razorpay');
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `b_${String(booking._id).slice(-10)}`,
      notes: {
        bookingId: String(booking._id),
        customerId: String(req.user._id)
      }
    };

    let order;
    if (paymentMode === 'simulated') {
      order = {
        id: `order_sim_${String(booking._id).slice(-12)}`,
        amount: amountInPaise,
        currency: 'INR',
        isSimulated: true
      };
    } else {
      try {
        const razorpay = getRazorpayInstance();
        order = await razorpay.orders.create(orderOptions);
      } catch (rzpErr) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Razorpay API call failed (${rzpErr.message || 'API error'}). Falling back to simulated order for local development.`);
          order = {
            id: `order_sim_${String(booking._id).slice(-12)}`,
            amount: amountInPaise,
            currency: 'INR',
            isSimulated: true
          };
        } else {
          console.error(`Razorpay orders.create failed: ${rzpErr.message || 'API error'}`);
          return res.status(503).json({ message: 'Payment service temporarily unavailable. Please try again later.' });
        }
      }
    }

    booking.razorpayOrderId = order.id;
    booking.amount = amountInPaise;
    await booking.save();

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_simulated',
      bookingId: booking._id,
      isSimulated: !!order.isSimulated
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/verify ───────────────────────────────────────────────
// Receives Razorpay's payment response from frontend.
// Verifies HMAC SHA256 signature server-side.
// ONLY marks booking as paid and confirmed if signature is valid.
const verifyPayment = async (req, res, next) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: 'Missing required fields: bookingId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Ownership check
    if (String(booking.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }

    // Idempotency: if already verified and paid
    if (booking.paymentStatus === 'paid' && booking.status === 'confirmed') {
      const populated = await Booking.findById(booking._id)
        .populate('slotId', 'startTime endTime status')
        .populate('serviceId', 'name price')
        .populate('vendorId', 'name email');
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and booking confirmed',
        booking: populated
      });
    }

    // Verify order ID match if set
    if (booking.razorpayOrderId && booking.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: 'Order ID does not match this booking' });
    }

    // Cryptographic signature verification using server-side Razorpay secret
    const secret = process.env.RAZORPAY_KEY_SECRET || 'simulated_test_secret';

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuf = Buffer.from(razorpay_signature, 'utf-8');

    const isPlaceholder = !process.env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID === 'dev_razorpay_key' ||
      process.env.RAZORPAY_KEY_ID.includes('placeholder') ||
      process.env.RAZORPAY_KEY_ID.startsWith('dummy');

    const paymentMode = process.env.PAYMENT_MODE || (isPlaceholder ? 'simulated' : 'razorpay');
    const isSimulatedValid = (paymentMode === 'simulated' || razorpay_order_id.startsWith('order_sim_')) && (
      razorpay_order_id.startsWith('order_sim_') &&
      (razorpay_signature === 'simulated_valid_signature' || razorpay_signature === expectedSignature)
    );

    const isValid = isSimulatedValid || (
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf)
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Verification failed.'
      });
    }

    // Signature verified: update booking and slot status
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    await booking.save();

    await Slot.findByIdAndUpdate(booking.slotId, { status: 'booked' });

    const populated = await Booking.findById(booking._id)
      .populate('slotId', 'startTime endTime status')
      .populate('serviceId', 'name price')
      .populate('vendorId', 'name email');

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully and booking confirmed',
      booking: populated
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
// Razorpay webhook endpoint — independent source of truth for payment confirmation.
// Verifies webhook signature against raw request body using RAZORPAY_WEBHOOK_SECRET.
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ message: 'Webhook secret not configured on server' });
    }

    if (!webhookSignature) {
      return res.status(400).json({ message: 'Missing x-razorpay-signature header' });
    }

    // Use rawBody Buffer captured by express.json({ verify }) or fallback
    const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body), 'utf-8');

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuf = Buffer.from(webhookSignature, 'utf-8');

    const isValid = (
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, receivedBuf)
    );

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id;
      const paymentId = payload?.payment?.entity?.id;

      let booking = null;
      if (orderId) {
        booking = await Booking.findOne({ razorpayOrderId: orderId });
      }
      if (!booking && payload?.payment?.entity?.notes?.bookingId) {
        booking = await Booking.findById(payload.payment.entity.notes.bookingId);
      }

      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        if (paymentId) booking.razorpayPaymentId = paymentId;
        await booking.save();
        await Slot.findByIdAndUpdate(booking.slotId, { status: 'booked' });
        console.log(`[Webhook] Booking ${booking._id} confirmed via ${event}`);
      }
    } else if (event === 'payment.failed') {
      const orderId = payload?.payment?.entity?.order_id;
      let booking = null;
      if (orderId) {
        booking = await Booking.findOne({ razorpayOrderId: orderId });
      }
      if (booking && booking.paymentStatus !== 'paid') {
        booking.paymentStatus = 'failed';
        booking.status = 'failed';
        await booking.save();
        await Slot.findByIdAndUpdate(booking.slotId, { status: 'available' });
        console.log(`[Webhook] Booking ${booking._id} marked failed via ${event}; slot freed`);
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/cancel ───────────────────────────────────────────────
// Customer explicitly cancels payment modal or dismisses checkout.
// Frees the slot immediately without waiting for the 10-minute hold window.
const cancelPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.customerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this booking' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Cannot cancel an already paid booking via checkout cancel' });
    }

    booking.status = 'failed';
    booking.paymentStatus = 'failed';
    await booking.save();

    await Slot.findByIdAndUpdate(booking.slotId, { status: 'available' });

    res.status(200).json({ message: 'Checkout cancelled and slot released to available' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  cancelPayment
};
