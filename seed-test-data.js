/**
 * Seed script — creates test vendors, services, and slots via the API.
 *
 * Usage:  node seed-test-data.js
 *
 * Prerequisites: the server must be running on http://localhost:5000
 */

const BASE = 'http://localhost:5000/api';

async function api(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// ── Test data ───────────────────────────────────────────────────────────────

const vendors = [
  {
    name: 'Priya\'s Beauty Studio',
    email: 'priya@test.com',
    password: 'Test@1234',
    services: [
      { name: 'Bridal Makeup', price: 5000 },
      { name: 'Hair Styling', price: 1500 },
      { name: 'Facial Treatment', price: 800 },
    ]
  },
  {
    name: 'Raj Plumbing Services',
    email: 'raj@test.com',
    password: 'Test@1234',
    services: [
      { name: 'Pipe Repair', price: 600 },
      { name: 'Full Bathroom Fitting', price: 12000 },
    ]
  },
  {
    name: 'FitZone Personal Training',
    email: 'fitzone@test.com',
    password: 'Test@1234',
    services: [
      { name: 'Personal Training Session', price: 1000 },
      { name: 'Group Yoga Class', price: 400 },
      { name: 'Diet Consultation', price: 700 },
    ]
  },
  {
    name: 'SparkClean Home Services',
    email: 'sparkclean@test.com',
    password: 'Test@1234',
    services: [
      { name: 'Deep Home Cleaning', price: 2500 },
      { name: 'Kitchen Cleaning', price: 900 },
    ]
  },
  {
    name: 'TechFix Repairs',
    email: 'techfix@test.com',
    password: 'Test@1234',
    services: [
      { name: 'Laptop Repair', price: 1500 },
      { name: 'Phone Screen Replacement', price: 2000 },
      { name: 'AC Servicing', price: 1200 },
    ]
  },
];

const customers = [
  { name: 'Amit Kumar', email: 'amit@test.com', password: 'Test@1234' },
  { name: 'Sneha Sharma', email: 'sneha@test.com', password: 'Test@1234' },
];

// Helper: generate slot times for the next 5 days, 3 slots per day
function generateSlots() {
  const slots = [];
  const now = new Date();
  for (let day = 1; day <= 5; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);

    const hours = [9, 12, 16]; // 9 AM, 12 PM, 4 PM
    for (const h of hours) {
      const start = new Date(date);
      start.setHours(h, 0, 0, 0);
      const end = new Date(start);
      end.setHours(h + 1);
      slots.push({ startTime: start.toISOString(), endTime: end.toISOString() });
    }
  }
  return slots;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding test data...\n');

  // 1. Create vendors + services + slots
  for (const v of vendors) {
    let token;
    try {
      const signupRes = await api('/auth/signup', 'POST', {
        name: v.name, email: v.email, password: v.password, role: 'vendor'
      });
      token = signupRes.token;
      console.log(`✅ Vendor created: ${v.name} (${v.email})`);
    } catch (err) {
      // Might already exist — try logging in
      try {
        const loginRes = await api('/auth/login', 'POST', {
          email: v.email, password: v.password
        });
        token = loginRes.token;
        console.log(`🔄 Vendor already exists, logged in: ${v.name}`);
      } catch (loginErr) {
        console.error(`❌ Failed for vendor ${v.name}:`, loginErr.message);
        continue;
      }
    }

    // Create services
    for (const svc of v.services) {
      try {
        const service = await api('/services', 'POST', svc, token);
        console.log(`   📦 Service: ${svc.name} (₹${svc.price}) — id: ${service._id}`);

        // Create slots for this service
        const slots = generateSlots();
        let slotCount = 0;
        for (const slot of slots) {
          try {
            await api('/slots', 'POST', { serviceId: service._id, ...slot }, token);
            slotCount++;
          } catch (slotErr) {
            // Ignore duplicate slot errors
          }
        }
        console.log(`   🕐 ${slotCount} slots created for "${svc.name}"`);
      } catch (svcErr) {
        console.error(`   ❌ Service "${svc.name}" failed:`, svcErr.message);
      }
    }
    console.log('');
  }

  // 2. Create customer accounts & sample bookings
  console.log('── Creating customer accounts & sample bookings ──');
  for (const c of customers) {
    let customerToken;
    try {
      const reg = await api('/auth/signup', 'POST', { ...c, role: 'customer' });
      customerToken = reg.token;
      console.log(`✅ Customer created: ${c.name} (${c.email})`);
    } catch {
      const log = await api('/auth/login', 'POST', { email: c.email, password: c.password });
      customerToken = log.token;
      console.log(`🔄 Customer already exists, logged in: ${c.name}`);
    }

    if (c.email === 'amit@test.com') {
      try {
        // Find available slots
        const availableSlots = await api('/slots');
        if (availableSlots.length > 0) {
          // Book first slot
          const slotToBook = availableSlots[0];
          const booking = await api('/bookings', 'POST', { slotId: slotToBook._id }, customerToken);
          console.log(`   📅 Created booking for "${slotToBook.serviceId?.name || 'Service'}" (Pending payment)`);

          // Complete payment on this booking
          const order = await api('/payments/create-order', 'POST', { bookingId: booking._id }, customerToken);
          await api('/payments/verify', 'POST', {
            bookingId: booking._id,
            razorpay_order_id: order.orderId,
            razorpay_payment_id: `pay_seed_${Date.now()}`,
            razorpay_signature: 'simulated_valid_signature'
          }, customerToken);
          console.log(`   💳 Confirmed payment for booking ${booking._id}`);

          // Book second slot as pending
          if (availableSlots.length > 1) {
            const secondSlot = availableSlots[1];
            await api('/bookings', 'POST', { slotId: secondSlot._id }, customerToken);
            console.log(`   ⏳ Created second booking for "${secondSlot.serviceId?.name || 'Service'}" (Awaiting payment)`);
          }
        }
      } catch (bookErr) {
        console.log(`   ⚠️ Booking sample notice: ${bookErr.message}`);
      }
    }
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\n── Test Credentials ──────────────────────');
  console.log('Vendors  (password: Test@1234):');
  vendors.forEach(v => console.log(`  • ${v.email}`));
  console.log('Customers (password: Test@1234):');
  customers.forEach(c => console.log(`  • ${c.email}`));
  console.log('──────────────────────────────────────────');
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
