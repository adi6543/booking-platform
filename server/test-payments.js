/**
 * Phase 5 — Razorpay Payment Flow & Verification Tests
 *
 * Covers:
 *  1. Booking creation sets status='pending', paymentStatus='pending', slot status='reserved'
 *  2. POST /api/payments/create-order generates order for service's price in paise (customer-only)
 *  3. Customer ownership enforcement (unauthorized user gets 403)
 *  4. TAMPERED signature verification — deliberately invalid signature must be rejected (400)
 *     and booking status must NOT change to paid/confirmed
 *  5. VALID signature verification — HMAC SHA256 verified server-side, marks booking paid/confirmed
 *     and flips slot to booked
 *  6. WEBHOOK independent processing — webhook payment.captured marks booking paid without /verify
 *  7. WEBHOOK invalid signature rejection — forged webhook rejected (400)
 *  8. WEBHOOK payment.failed handling — marks booking failed and frees slot back to available
 *  9. Slot hold expiration — expired holds released back to available
 *
 * Run: node server/test-payments.js
 */

'use strict';

process.env.JWT_SECRET = 'test_jwt_secret_phase5';
process.env.RAZORPAY_KEY_ID = 'rzp_test_Phase5TestKey';
process.env.RAZORPAY_KEY_SECRET = 'Phase5TestSecret_Key12345';
process.env.RAZORPAY_WEBHOOK_SECRET = 'Phase5WebhookSecret_Key67890';

const crypto = require('crypto');
const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('./src/models/User');
const Service = require('./src/models/Service');
const Slot = require('./src/models/Slot');
const Booking = require('./src/models/Booking');
const { releaseExpiredHolds } = require('./src/utils/bookingCleanup');
const razorpayConfig = require('./src/config/razorpay');

// Mock Razorpay instance to test order generation deterministically
let orderCounter = 1000;
const mockRazorpayInstance = {
  orders: {
    create: async (options) => {
      orderCounter++;
      return {
        id: `order_mock_${orderCounter}`,
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency || 'INR',
        receipt: options.receipt,
        status: 'created',
        notes: options.notes || {}
      };
    }
  }
};
razorpayConfig.getRazorpayInstance = () => mockRazorpayInstance;

const bookingRoutes = require('./src/routes/booking.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const errorHandler = require('./src/middlewares/errorHandler');

// ── Colors ────────────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function assert(condition, label, detail) {
  if (condition) {
    console.log(`  ${c.green('✓')} ${label}`);
    passed++;
  } else {
    console.log(`  ${c.red('✗')} ${label}`);
    if (detail) console.log(c.dim(`    Detail: ${JSON.stringify(detail)}`));
    failed++;
  }
}

// ── Test Runner ───────────────────────────────────────────────────────────────
async function runTests() {
  console.log(c.bold(c.cyan('\n══════════════════════════════════════════════════════════════')));
  console.log(c.bold(c.cyan('   Phase 5 — Razorpay Payments & Verification Test Suite')));
  console.log(c.bold(c.cyan('══════════════════════════════════════════════════════════════\n')));

  let mongoServer;
  let server;
  let baseUrl;

  try {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.log(c.dim('  Connected to in-memory MongoDB.\n'));

    const app = express();
    app.use(cors());
    app.use(express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    app.use('/api', bookingRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use(errorHandler);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;
    console.log(c.dim(`  Test server listening on ${baseUrl}\n`));

    // ── Helper: HTTP request ──────────────────────────────────────────────────
    async function apiRequest(endpoint, { method = 'GET', token, body, rawStringBody, headers = {} } = {}) {
      const h = { ...headers };
      if (!h['Content-Type'] && (body || rawStringBody)) {
        h['Content-Type'] = 'application/json';
      }
      if (token) h['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: h,
        body: rawStringBody !== undefined ? rawStringBody : (body ? JSON.stringify(body) : undefined)
      });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
      return { status: res.status, data };
    }

    // ── Seed users ────────────────────────────────────────────────────────────
    const vendor = await User.create({
      name: 'Ramesh Plumbing',
      email: 'ramesh@vendor.com',
      password: 'hashedpassword123',
      role: 'vendor'
    });

    const customer1 = await User.create({
      name: 'Aditi Sharma',
      email: 'aditi@customer.com',
      password: 'hashedpassword123',
      role: 'customer'
    });

    const customer2 = await User.create({
      name: 'Vikram Singh',
      email: 'vikram@customer.com',
      password: 'hashedpassword123',
      role: 'customer'
    });

    const tokenCustomer1 = jwt.sign({ id: customer1._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokenCustomer2 = jwt.sign({ id: customer2._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Seed Service with price ₹850
    const service = await Service.create({
      name: 'Deep Pipe Cleaning & Leak Fix',
      price: 850,
      vendorId: vendor._id
    });

    // Seed Slot 1
    const slot1 = await Slot.create({
      vendorId: vendor._id,
      serviceId: service._id,
      startTime: new Date('2026-10-02T10:00:00Z'),
      endTime:   new Date('2026-10-02T11:00:00Z'),
      status:    'available'
    });

    // ══ Test 1: Customer creates pending booking ══════════════════════════════
    console.log(c.bold('Step 1 — Booking Hold Creation'));
    const bookRes = await apiRequest('/bookings', {
      method: 'POST',
      token: tokenCustomer1,
      body: { slotId: slot1._id.toString() }
    });

    assert(bookRes.status === 201, 'Booking created with HTTP 201');
    assert(bookRes.data.status === 'pending', 'Booking status is "pending" (not confirmed yet)');
    assert(bookRes.data.paymentStatus === 'pending', 'Booking paymentStatus is "pending"');
    assert(bookRes.data.amount === 85000, `Booking amount is 85000 paise (₹850) — got ${bookRes.data.amount}`);

    const slot1AfterBook = await Slot.findById(slot1._id);
    assert(slot1AfterBook.status === 'reserved', 'Slot status flipped to "reserved" during hold');
    const booking1Id = bookRes.data._id;

    // ══ Test 2: POST /api/payments/create-order ═══════════════════════════════
    console.log('\n' + c.bold('Step 2 — Razorpay Order Creation (POST /api/payments/create-order)'));
    const orderRes = await apiRequest('/payments/create-order', {
      method: 'POST',
      token: tokenCustomer1,
      body: { bookingId: booking1Id }
    });

    assert(orderRes.status === 200, 'create-order returned HTTP 200');
    assert(!!orderRes.data.orderId, `Received orderId: ${orderRes.data.orderId}`);
    assert(orderRes.data.amount === 85000, 'Order amount matches service price in paise (85000)');
    assert(orderRes.data.keyId === 'rzp_test_Phase5TestKey', 'Returned Razorpay Key ID');

    const bookingAfterOrder = await Booking.findById(booking1Id);
    assert(bookingAfterOrder.razorpayOrderId === orderRes.data.orderId, 'Booking updated with razorpayOrderId');

    // ══ Test 3: Customer Ownership Security ═══════════════════════════════════
    console.log('\n' + c.bold('Step 3 — Customer Ownership Enforcement'));
    const hijackRes = await apiRequest('/payments/create-order', {
      method: 'POST',
      token: tokenCustomer2, // Customer 2 tries to pay for Customer 1's booking
      body: { bookingId: booking1Id }
    });
    assert(hijackRes.status === 403, `Unauthorized user blocked with HTTP 403 (got: ${hijackRes.status})`);

    // ══ Test 4: TAMPERED Signature Verification (Must be rejected) ═════════════
    console.log('\n' + c.bold('Step 4 — TAMPERED / Invalid Payment Signature Rejection'));
    console.log(c.dim('  Submitting deliberately fake signature to /api/payments/verify...'));

    const tamperedRes = await apiRequest('/payments/verify', {
      method: 'POST',
      token: tokenCustomer1,
      body: {
        bookingId: booking1Id,
        razorpay_order_id: orderRes.data.orderId,
        razorpay_payment_id: 'pay_test_tampered_99999',
        razorpay_signature: 'fake_tampered_invalid_signature_hex_deadbeef'
      }
    });

    assert(tamperedRes.status === 400, `Tampered signature rejected with HTTP 400 (got: ${tamperedRes.status})`);
    assert(tamperedRes.data.success === false || tamperedRes.data.message.includes('Invalid'), 'Error message states invalid signature');

    const bookingAfterTamper = await Booking.findById(booking1Id);
    assert(bookingAfterTamper.paymentStatus === 'pending', 'Booking paymentStatus is STILL "pending" (NOT marked paid)');
    assert(bookingAfterTamper.status === 'pending', 'Booking status is STILL "pending" (NOT confirmed)');

    const slotAfterTamper = await Slot.findById(slot1._id);
    assert(slotAfterTamper.status === 'reserved', 'Slot status is STILL "reserved" (NOT marked booked)');

    // ══ Test 5: VALID Signature Verification ══════════════════════════════════
    console.log('\n' + c.bold('Step 5 — VALID Server-Side Payment Verification'));
    const validPaymentId = 'pay_test_valid_123456';
    const signPayload = `${orderRes.data.orderId}|${validPaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signPayload)
      .digest('hex');

    console.log(c.dim(`  Generated HMAC-SHA256 signature: ${validSignature.slice(0, 16)}...`));

    const verifyRes = await apiRequest('/payments/verify', {
      method: 'POST',
      token: tokenCustomer1,
      body: {
        bookingId: booking1Id,
        razorpay_order_id: orderRes.data.orderId,
        razorpay_payment_id: validPaymentId,
        razorpay_signature: validSignature
      }
    });

    assert(verifyRes.status === 200, `Valid signature accepted with HTTP 200 (got: ${verifyRes.status})`);
    assert(verifyRes.data.success === true, 'Response confirms success: true');

    const bookingAfterValid = await Booking.findById(booking1Id);
    assert(bookingAfterValid.paymentStatus === 'paid', 'Booking paymentStatus updated to "paid"');
    assert(bookingAfterValid.status === 'confirmed', 'Booking status updated to "confirmed"');
    assert(bookingAfterValid.razorpayPaymentId === validPaymentId, 'Booking has razorpayPaymentId stored');

    const slotAfterValid = await Slot.findById(slot1._id);
    assert(slotAfterValid.status === 'booked', 'Slot status flipped to "booked"');

    // ══ Test 6: WEBHOOK Independent Confirmation ══════════════════════════════
    console.log('\n' + c.bold('Step 6 — Independent Razorpay Webhook Event Processing'));
    console.log(c.dim('  Creating slot 2 & booking 2 without frontend /verify call...'));

    const slot2 = await Slot.create({
      vendorId: vendor._id,
      serviceId: service._id,
      startTime: new Date('2026-10-02T14:00:00Z'),
      endTime:   new Date('2026-10-02T15:00:00Z'),
      status:    'available'
    });

    const book2Res = await apiRequest('/bookings', {
      method: 'POST',
      token: tokenCustomer2,
      body: { slotId: slot2._id.toString() }
    });
    const booking2Id = book2Res.data._id;

    const order2Res = await apiRequest('/payments/create-order', {
      method: 'POST',
      token: tokenCustomer2,
      body: { bookingId: booking2Id }
    });
    const order2Id = order2Res.data.orderId;

    // Simulate Razorpay webhook payload
    const webhookPayloadObj = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_webhook_77777',
            order_id: order2Id,
            amount: 85000,
            status: 'captured',
            notes: { bookingId: booking2Id }
          }
        }
      }
    };
    const webhookBodyStr = JSON.stringify(webhookPayloadObj);
    const validWebhookSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(Buffer.from(webhookBodyStr, 'utf-8'))
      .digest('hex');

    const webhookRes = await apiRequest('/payments/webhook', {
      method: 'POST',
      rawStringBody: webhookBodyStr,
      headers: {
        'x-razorpay-signature': validWebhookSig
      }
    });

    assert(webhookRes.status === 200, 'Webhook processed with HTTP 200');
    assert(webhookRes.data.status === 'ok', 'Webhook returned { status: "ok" }');

    const booking2Doc = await Booking.findById(booking2Id);
    assert(booking2Doc.paymentStatus === 'paid', 'Webhook independently flipped paymentStatus to "paid"');
    assert(booking2Doc.status === 'confirmed', 'Webhook independently flipped status to "confirmed"');
    assert(booking2Doc.razorpayPaymentId === 'pay_test_webhook_77777', 'Webhook saved razorpayPaymentId');

    const slot2Doc = await Slot.findById(slot2._id);
    assert(slot2Doc.status === 'booked', 'Webhook flipped slot status to "booked"');

    // ══ Test 7: WEBHOOK Deliberately Forged Signature Rejection ══════════════
    console.log('\n' + c.bold('Step 7 — Deliberately Tampered Webhook Signature'));
    const fakeWebhookRes = await apiRequest('/payments/webhook', {
      method: 'POST',
      rawStringBody: webhookBodyStr,
      headers: {
        'x-razorpay-signature': 'forged_fake_webhook_signature_abcdef1234567890'
      }
    });
    assert(fakeWebhookRes.status === 400, `Tampered webhook signature rejected with HTTP 400 (got: ${fakeWebhookRes.status})`);

    // ══ Test 8: WEBHOOK payment.failed Releases Slot ══════════════════════════
    console.log('\n' + c.bold('Step 8 — Webhook payment.failed Handling'));
    const slot3 = await Slot.create({
      vendorId: vendor._id,
      serviceId: service._id,
      startTime: new Date('2026-10-03T09:00:00Z'),
      endTime:   new Date('2026-10-03T10:00:00Z'),
      status:    'available'
    });

    const book3Res = await apiRequest('/bookings', {
      method: 'POST',
      token: tokenCustomer1,
      body: { slotId: slot3._id.toString() }
    });
    const booking3Id = book3Res.data._id;
    const order3Res = await apiRequest('/payments/create-order', {
      method: 'POST',
      token: tokenCustomer1,
      body: { bookingId: booking3Id }
    });

    const failedPayloadObj = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_failed_00000',
            order_id: order3Res.data.orderId,
            status: 'failed'
          }
        }
      }
    };
    const failedPayloadStr = JSON.stringify(failedPayloadObj);
    const failedWebhookSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(Buffer.from(failedPayloadStr, 'utf-8'))
      .digest('hex');

    const failWebRes = await apiRequest('/payments/webhook', {
      method: 'POST',
      rawStringBody: failedPayloadStr,
      headers: { 'x-razorpay-signature': failedWebhookSig }
    });

    assert(failWebRes.status === 200, 'Failed webhook received with HTTP 200');
    const booking3Doc = await Booking.findById(booking3Id);
    assert(booking3Doc.paymentStatus === 'failed', 'Booking paymentStatus set to "failed"');
    assert(booking3Doc.status === 'failed', 'Booking status set to "failed"');

    const slot3Doc = await Slot.findById(slot3._id);
    assert(slot3Doc.status === 'available', 'Slot released back to "available"');

    // ══ Test 9: Slot Hold Expiration Sweep ════════════════════════════════════
    console.log('\n' + c.bold('Step 9 — Slot Hold Expiration Window'));
    const slot4 = await Slot.create({
      vendorId: vendor._id,
      serviceId: service._id,
      startTime: new Date('2026-10-03T11:00:00Z'),
      endTime:   new Date('2026-10-03T12:00:00Z'),
      status:    'available'
    });

    const expiredBooking = await Booking.create({
      slotId: slot4._id,
      customerId: customer1._id,
      vendorId: vendor._id,
      serviceId: service._id,
      amount: 85000,
      status: 'pending',
      paymentStatus: 'pending',
      expiresAt: new Date(Date.now() - 60 * 1000) // 1 minute in the past
    });
    await Slot.findByIdAndUpdate(slot4._id, { status: 'reserved' });

    const releasedCount = await releaseExpiredHolds();
    assert(releasedCount >= 1, `releaseExpiredHolds freed ${releasedCount} expired booking(s)`);

    const refreshedBooking = await Booking.findById(expiredBooking._id);
    assert(refreshedBooking.paymentStatus === 'failed', 'Expired booking marked paymentStatus="failed"');
    assert(refreshedBooking.status === 'failed', 'Expired booking marked status="failed"');

    const refreshedSlot4 = await Slot.findById(slot4._id);
    assert(refreshedSlot4.status === 'available', 'Expired slot returned to status="available"');

    // ══ Summary ═══════════════════════════════════════════════════════════════
    console.log('\n' + c.bold(c.cyan('══════════════════════════════════════════════════════════════')));
    const allPassed = failed === 0;
    if (allPassed) {
      console.log(c.bold(c.green(`  ✅ ALL ${passed} ASSERTIONS PASSED`)));
      console.log(c.green('  Order creation:                 VERIFIED'));
      console.log(c.green('  Tampered signature rejection:   VERIFIED (rejected with 400)'));
      console.log(c.green('  Valid signature verification:   VERIFIED (confirmed + paid)'));
      console.log(c.green('  Independent webhook processing: VERIFIED (confirmed + paid)'));
      console.log(c.green('  Tampered webhook rejection:     VERIFIED (rejected with 400)'));
      console.log(c.green('  Payment failure slot release:   VERIFIED (slot restored to available)'));
      console.log(c.green('  Slot hold expiration window:    VERIFIED (expired hold cleaned up)'));
    } else {
      console.log(c.bold(c.red(`  ❌ ${failed} ASSERTION(S) FAILED (${passed} passed)`)));
    }
    console.log(c.bold(c.cyan('══════════════════════════════════════════════════════════════\n')));

    process.exitCode = allPassed ? 0 : 1;
  } catch (err) {
    console.error(c.red('\nFatal test error:'), err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
}

runTests();
