/**
 * Bug 1 — Simulated Signature Bypass — Comprehensive Fix Verification
 *
 * Tests:
 *   A. razorpay mode + Razorpay API failure   → createOrder returns 503
 *   B. razorpay mode + magic string on sim ID  → verify REJECTS with 400
 *   C. razorpay mode + valid HMAC              → verify ACCEPTS with 200
 *   D. razorpay mode + invalid HMAC            → verify REJECTS with 400
 *   E. simulated mode + magic string           → verify ACCEPTS with 200
 *
 * Run: node server/test-bug1-simulated-sig-bypass.js
 */

'use strict';

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'test_jwt_secret_bug1';
process.env.RAZORPAY_KEY_ID = 'rzp_live_REAL_PROD_KEY';
process.env.RAZORPAY_KEY_SECRET = 'REAL_PROD_SECRET_that_attacker_does_not_know';
process.env.RAZORPAY_WEBHOOK_SECRET = 'REAL_PROD_WEBHOOK_SECRET';

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
const razorpayConfig = require('./src/config/razorpay');

// Controllable mock
let mockShouldFail = false;
let mockOrderCounter = 9000;
razorpayConfig.getRazorpayInstance = () => ({
  orders: {
    create: async (options) => {
      if (mockShouldFail) throw new Error('Razorpay API unavailable');
      mockOrderCounter++;
      return {
        id: `order_real_${mockOrderCounter}`,
        amount: options.amount,
        currency: options.currency || 'INR',
      };
    }
  }
});

const bookingRoutes = require('./src/routes/booking.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const errorHandler = require('./src/middlewares/errorHandler');

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ${c.green('✓')} ${label}`);
    passed++;
  } else {
    console.log(`  ${c.red('✗')} ${label}`);
    failed++;
  }
}

async function runTests() {
  console.log(c.bold(c.cyan('\n══════════════════════════════════════════════════════════════')));
  console.log(c.bold(c.cyan('  Bug 1 — Simulated Signature Bypass — Fix Verification')));
  console.log(c.bold(c.cyan('══════════════════════════════════════════════════════════════\n')));

  let mongoServer, server;

  try {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.log(c.dim('  Connected to in-memory MongoDB.\n'));

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api', bookingRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use(errorHandler);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    async function api(endpoint, { method = 'GET', token, body } = {}) {
      const h = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method, headers: h,
        body: body ? JSON.stringify(body) : undefined
      });
      return { status: res.status, data: await res.json() };
    }

    // Helper: create a fresh slot + book it + return { bookingId, slotId }
    let slotCounter = 0;
    async function bookFreshSlot(customerToken, vendor, service) {
      slotCounter++;
      const slot = await Slot.create({
        vendorId: vendor._id, serviceId: service._id,
        startTime: new Date(`2026-12-${String(slotCounter).padStart(2, '0')}T10:00:00Z`),
        endTime:   new Date(`2026-12-${String(slotCounter).padStart(2, '0')}T11:00:00Z`),
        status: 'available'
      });
      const bookRes = await api('/bookings', {
        method: 'POST', token: customerToken,
        body: { slotId: slot._id.toString() }
      });
      return { bookingId: bookRes.data._id, slotId: slot._id };
    }

    // Seed
    const vendor = await User.create({ name: 'Vendor', email: 'v@b1.com', password: 'x', role: 'vendor' });
    const customer = await User.create({ name: 'Customer', email: 'c@b1.com', password: 'x', role: 'customer' });
    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const service = await Service.create({ name: 'Test Service', price: 500, vendorId: vendor._id });

    // ══════════════════════════════════════════════════════════════════════════
    // Test A: razorpay mode + Razorpay API failure → 503
    // ══════════════════════════════════════════════════════════════════════════
    console.log(c.bold('Test A — razorpay mode + Razorpay API failure → 503'));
    process.env.PAYMENT_MODE = 'razorpay';
    mockShouldFail = true;

    const { bookingId: bookingA } = await bookFreshSlot(token, vendor, service);
    const orderResA = await api('/payments/create-order', {
      method: 'POST', token, body: { bookingId: bookingA }
    });

    assert(orderResA.status === 503, `createOrder returns 503 (got ${orderResA.status})`);
    assert(orderResA.data.message.includes('temporarily unavailable'), 'Error message says service unavailable');
    mockShouldFail = false;

    // ══════════════════════════════════════════════════════════════════════════
    // Test B: razorpay mode + magic string on order_sim_ ID → REJECTED
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n' + c.bold('Test B — razorpay mode + magic string on order_sim_ ID → 400'));
    process.env.PAYMENT_MODE = 'razorpay';

    const { bookingId: bookingB } = await bookFreshSlot(token, vendor, service);
    // Manually inject an order_sim_ ID (as if it leaked from dev or an earlier fallback)
    await Booking.findByIdAndUpdate(bookingB, { razorpayOrderId: 'order_sim_LEAKED_ID' });

    const verifyB = await api('/payments/verify', {
      method: 'POST', token,
      body: {
        bookingId: bookingB,
        razorpay_order_id: 'order_sim_LEAKED_ID',
        razorpay_payment_id: 'pay_FAKE',
        razorpay_signature: 'simulated_valid_signature'   // ← THE EXPLOIT
      }
    });

    assert(verifyB.status === 400, `Magic string REJECTED with 400 (got ${verifyB.status})`);
    const bB = await Booking.findById(bookingB);
    assert(bB.paymentStatus === 'pending', `Booking still pending (got ${bB.paymentStatus})`);

    // ══════════════════════════════════════════════════════════════════════════
    // Test C: razorpay mode + valid HMAC → ACCEPTED
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n' + c.bold('Test C — razorpay mode + valid HMAC → 200'));
    process.env.PAYMENT_MODE = 'razorpay';

    const { bookingId: bookingC, slotId: slotC } = await bookFreshSlot(token, vendor, service);
    const orderResC = await api('/payments/create-order', {
      method: 'POST', token, body: { bookingId: bookingC }
    });
    const orderIdC = orderResC.data.orderId;
    const paymentIdC = 'pay_real_valid_123';

    const validSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderIdC}|${paymentIdC}`)
      .digest('hex');

    const verifyC = await api('/payments/verify', {
      method: 'POST', token,
      body: {
        bookingId: bookingC,
        razorpay_order_id: orderIdC,
        razorpay_payment_id: paymentIdC,
        razorpay_signature: validSig
      }
    });

    assert(verifyC.status === 200, `Valid HMAC accepted with 200 (got ${verifyC.status})`);
    const bC = await Booking.findById(bookingC);
    assert(bC.paymentStatus === 'paid', 'Booking marked paid');
    assert(bC.status === 'confirmed', 'Booking confirmed');
    const sC = await Slot.findById(slotC);
    assert(sC.status === 'booked', 'Slot marked booked');

    // ══════════════════════════════════════════════════════════════════════════
    // Test D: razorpay mode + invalid HMAC → REJECTED
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n' + c.bold('Test D — razorpay mode + invalid HMAC → 400'));
    process.env.PAYMENT_MODE = 'razorpay';

    const { bookingId: bookingD } = await bookFreshSlot(token, vendor, service);
    const orderResD = await api('/payments/create-order', {
      method: 'POST', token, body: { bookingId: bookingD }
    });

    const verifyD = await api('/payments/verify', {
      method: 'POST', token,
      body: {
        bookingId: bookingD,
        razorpay_order_id: orderResD.data.orderId,
        razorpay_payment_id: 'pay_real_456',
        razorpay_signature: 'totally_wrong_signature_deadbeef'
      }
    });

    assert(verifyD.status === 400, `Invalid HMAC rejected with 400 (got ${verifyD.status})`);
    const bD = await Booking.findById(bookingD);
    assert(bD.paymentStatus === 'pending', `Booking still pending (got ${bD.paymentStatus})`);

    // ══════════════════════════════════════════════════════════════════════════
    // Test E: simulated mode + magic string → ACCEPTED
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n' + c.bold('Test E — simulated mode + magic string → 200'));
    process.env.PAYMENT_MODE = 'simulated';

    const { bookingId: bookingE, slotId: slotE } = await bookFreshSlot(token, vendor, service);
    const orderResE = await api('/payments/create-order', {
      method: 'POST', token, body: { bookingId: bookingE }
    });

    assert(orderResE.data.orderId.startsWith('order_sim_'), `Got simulated order: ${orderResE.data.orderId}`);

    const verifyE = await api('/payments/verify', {
      method: 'POST', token,
      body: {
        bookingId: bookingE,
        razorpay_order_id: orderResE.data.orderId,
        razorpay_payment_id: 'pay_sim_789',
        razorpay_signature: 'simulated_valid_signature'
      }
    });

    assert(verifyE.status === 200, `Simulated mode accepts magic string with 200 (got ${verifyE.status})`);
    const bE = await Booking.findById(bookingE);
    assert(bE.paymentStatus === 'paid', 'Booking marked paid in simulated mode');
    assert(bE.status === 'confirmed', 'Booking confirmed in simulated mode');
    const sE = await Slot.findById(slotE);
    assert(sE.status === 'booked', 'Slot marked booked in simulated mode');

    // Reset for other tests
    process.env.PAYMENT_MODE = 'razorpay';

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log('\n' + c.bold(c.cyan('══════════════════════════════════════════════════════════════')));
    if (failed === 0) {
      console.log(c.bold(c.green(`  ✅ ALL ${passed} ASSERTIONS PASSED`)));
      console.log(c.green('  razorpay mode: API failure → 503          VERIFIED'));
      console.log(c.green('  razorpay mode: magic string → REJECTED    VERIFIED'));
      console.log(c.green('  razorpay mode: valid HMAC → ACCEPTED      VERIFIED'));
      console.log(c.green('  razorpay mode: invalid HMAC → REJECTED    VERIFIED'));
      console.log(c.green('  simulated mode: magic string → ACCEPTED   VERIFIED'));
    } else {
      console.log(c.bold(c.red(`  ❌ ${failed} ASSERTION(S) FAILED (${passed} passed)`)));
    }
    console.log(c.bold(c.cyan('══════════════════════════════════════════════════════════════\n')));

    process.exitCode = failed === 0 ? 0 : 1;

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
