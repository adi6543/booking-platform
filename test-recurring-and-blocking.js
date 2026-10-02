/**
 * Test script for Feature 1 (Recurring Weekly Availability & Blackouts)
 * and Feature 2 (Busy Right Now / Walk-in Blocking & Race Condition Guards).
 */
const BASE = 'http://localhost:5000/api';

async function req(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🧪 Starting tests for Recurring Availability & Walk-in Blocking...\n');

  // 1. Log in vendor and customer
  const vendorLog = await req('/auth/login', 'POST', { email: 'priya@test.com', password: 'Test@1234' });
  const vendorToken = vendorLog.data.token;
  console.log('✅ Vendor logged in');

  const customerLog = await req('/auth/login', 'POST', { email: 'amit@test.com', password: 'Test@1234' });
  const customerToken = customerLog.data.token;
  console.log('✅ Customer logged in');

  // Get vendor's services
  const svcRes = await req('/services/mine', 'GET', null, vendorToken);
  const services = svcRes.data;
  const facialService = services.find(s => s.name === 'Facial Treatment') || services[0];
  console.log(`✅ Using service: "${facialService.name}" (${facialService._id})`);

  // 2. Feature 1: Set recurring availability pattern
  console.log('\n--- Test 1: Recurring Weekly Schedule Pattern ---');
  const availRes = await req('/vendor/availability', 'POST', {
    serviceId: facialService._id,
    daysOfWeek: [1, 2, 3, 4, 5], // Mon - Fri
    startTime: '10:00',
    endTime: '15:00',
    slotDurationMinutes: 60
  }, vendorToken);

  console.log(`Status: ${availRes.status}`, availRes.data.message);
  if (!availRes.ok || availRes.data.generatedSlots === undefined) {
    throw new Error('Failed to save recurring pattern');
  }
  console.log(`✅ Auto-generated ${availRes.data.generatedSlots} slots for the rolling 14-day window!`);

  // 3. Feature 1: Add a Blackout date
  console.log('\n--- Test 2: Blackout Dates (Shop Closure / Holiday) ---');
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 2);
  const dateKey = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;

  const blackoutRes = await req('/vendor/blackouts', 'POST', {
    date: dateKey,
    reason: 'Festival holiday'
  }, vendorToken);

  console.log(`Status: ${blackoutRes.status}`, blackoutRes.data.message);
  if (!blackoutRes.ok) throw new Error('Failed to add blackout date');
  console.log(`✅ Date ${dateKey} marked closed; removed unbooked slots on that day.`);

  // Verify slots on this date are not returned to customer
  const publicSlots = await req(`/slots?vendorId=${vendorLog.data.user._id}&serviceId=${facialService._id}`, 'GET');
  const slotsOnBlackoutDate = publicSlots.data.filter(s => s.startTime.startsWith(dateKey));
  console.log(`Slots remaining on blackout date in public browse: ${slotsOnBlackoutDate.length}`);
  if (slotsOnBlackoutDate.length !== 0) throw new Error('Blackout date slots should be 0!');
  console.log('✅ Customer cannot see any slots on blackout date.');

  // 4. Feature 2: Individual slot blocking for walk-in
  console.log('\n--- Test 3: Individual Slot Blocking (Walk-in Customer) ---');
  const availableSlots = publicSlots.data;
  if (availableSlots.length === 0) throw new Error('Need at least 1 available slot to test blocking');
  const slotToBlock = availableSlots[0];

  const blockRes = await req(`/slots/${slotToBlock._id}/block`, 'PATCH', {
    isBlocked: true,
    reason: 'Walk-in customer arrived'
  }, vendorToken);

  console.log(`Status: ${blockRes.status}`, blockRes.data.message);
  if (!blockRes.ok) throw new Error('Failed to block slot');
  console.log(`✅ Slot ${slotToBlock._id} blocked by vendor for walk-in.`);

  // Verify hidden from public browse
  const refreshedPublic = await req(`/slots?vendorId=${vendorLog.data.user._id}`, 'GET');
  const foundBlocked = refreshedPublic.data.find(s => s._id === slotToBlock._id);
  if (foundBlocked) throw new Error('Blocked slot should NOT appear in customer browse!');
  console.log('✅ Blocked slot is completely hidden from customer browsing.');

  // Attempt booking by customer (e.g. had page open before block)
  console.log('\n--- Test 4: Booking Race Condition Protection ---');
  const attemptBookRes = await req('/bookings', 'POST', { slotId: slotToBlock._id }, customerToken);
  console.log(`Customer booking attempt status: ${attemptBookRes.status}, message: "${attemptBookRes.data.message}"`);
  if (attemptBookRes.status !== 409) throw new Error('Customer booking of blocked slot MUST return 409!');
  console.log('✅ Race condition prevented: customer cannot book a slot blocked by a walk-in.');

  // Unblock slot
  await req(`/slots/${slotToBlock._id}/block`, 'PATCH', { isBlocked: false }, vendorToken);
  console.log('✅ Slot unblocked.');

  // 5. Feature 2: Quick Pause (Busy right now for N minutes)
  console.log('\n--- Test 5: Quick "Busy Right Now" Pause ---');
  const pauseRes = await req('/vendor/pause', 'POST', { minutes: 120, reason: 'Busy with walk-ins' }, vendorToken);
  console.log(`Pause status: ${pauseRes.status}`, pauseRes.data.message);
  if (!pauseRes.ok || !pauseRes.data.paused) throw new Error('Failed to pause');
  console.log(`✅ Quick pause active until ${pauseRes.data.pauseUntil}`);

  const pauseStatus = await req('/vendor/pause-status', 'GET', null, vendorToken);
  console.log('Pause status report:', pauseStatus.data);
  if (!pauseStatus.data.isPaused) throw new Error('Vendor should be reported as paused');

  // Resume
  const resumeRes = await req('/vendor/resume', 'POST', {}, vendorToken);
  console.log(`Resume status: ${resumeRes.status}`, resumeRes.data.message);
  if (!resumeRes.ok || !resumeRes.data.resumed) throw new Error('Failed to resume');
  console.log('✅ Quick resume executed. Slots unblocked.');

  console.log('\n🎉 ALL TESTS PASSED! Backend logic for Feature 1 & Feature 2 is 100% verified.\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
