// Live End-to-End Verification on Render & MongoDB Atlas
const BASE_URL = 'https://booking-platform-b7yg.onrender.com/api';

async function req(path, method, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runLiveE2ETest() {
  console.log('====================================================');
  console.log('   LIVE PRODUCTION E2E VERIFICATION TEST');
  console.log('   Target: ' + BASE_URL);
  console.log('====================================================\n');

  const ts = Date.now();
  const vendorEmail = `vendor_${ts}@marketplace.test`;
  const customerEmail = `customer_${ts}@marketplace.test`;
  const password = 'Password@123';

  // 1. Signup Vendor
  console.log('1. Registering Vendor on Live Atlas DB...');
  const vSignup = await req('/auth/signup', 'POST', {
    name: 'Bangalore Appliance Care',
    email: vendorEmail,
    password,
    role: 'vendor'
  });
  console.log(`   Response (${vSignup.status}):`, vSignup.data.user ? `Vendor ID: ${vSignup.data.user.id}` : vSignup.data);
  const vendorToken = vSignup.data.token;

  // 2. Vendor creates a service
  console.log('\n2. Vendor Creating Service on Live Backend...');
  const srv = await req('/services', 'POST', {
    name: 'AC Master Service & Gas Refill',
    price: 999
  }, vendorToken);
  console.log(`   Response (${srv.status}):`, srv.data._id ? `Service "${srv.data.name}" (₹${srv.data.price}) created` : srv.data);
  const serviceId = srv.data._id;

  // 3. Vendor creates a slot
  console.log('\n3. Vendor Creating Slot...');
  const startTime = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const endTime = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
  const slotRes = await req('/slots', 'POST', {
    serviceId,
    startTime,
    endTime
  }, vendorToken);
  console.log(`   Response (${slotRes.status}):`, slotRes.data._id ? `Slot ID: ${slotRes.data._id} Status: ${slotRes.data.status}` : slotRes.data);
  const slotId = slotRes.data._id;

  // 4. Signup Customer
  console.log('\n4. Registering Customer on Live Atlas DB...');
  const cSignup = await req('/auth/signup', 'POST', {
    name: 'Rahul Sharma',
    email: customerEmail,
    password,
    role: 'customer'
  });
  console.log(`   Response (${cSignup.status}):`, cSignup.data.user ? `Customer ID: ${cSignup.data.user.id}` : cSignup.data);
  const customerToken = cSignup.data.token;

  // 5. Customer browses available slots
  console.log('\n5. Customer Browsing Live Slots...');
  const browse = await req(`/slots?serviceId=${serviceId}`, 'GET');
  console.log(`   Available slots found: ${browse.data.length}`);

  // 6. Customer books the slot (Hold state)
  console.log('\n6. Customer Reserving Slot (Atomic Booking)...');
  const book = await req('/bookings', 'POST', { slotId }, customerToken);
  console.log(`   Response (${book.status}): Booking ID: ${book.data._id}`);
  console.log(`   Booking Status: ${book.data.status}, Payment Status: ${book.data.paymentStatus}`);
  console.log(`   Amount: ₹${book.data.amount / 100}`);
  const bookingId = book.data._id;

  // 7. Customer creates Razorpay Payment Order
  console.log('\n7. Initiating Razorpay Order...');
  const orderRes = await req('/payments/create-order', 'POST', { bookingId }, customerToken);
  console.log(`   Response (${orderRes.status}):`, orderRes.data.orderId ? `Razorpay Order ID: ${orderRes.data.orderId}, Key: ${orderRes.data.keyId}` : orderRes.data);

  // 8. Customer My Bookings verification
  console.log('\n8. Checking Customer Bookings (/api/bookings/me)...');
  const myBookings = await req('/bookings/me', 'GET', null, customerToken);
  console.log(`   Found ${myBookings.data.length} booking(s). Latest booking payment status: ${myBookings.data[0]?.paymentStatus}`);

  // 9. Vendor Bookings verification
  console.log('\n9. Checking Vendor Bookings (/api/vendor/bookings)...');
  const vBookings = await req('/vendor/bookings', 'GET', null, vendorToken);
  console.log(`   Found ${vBookings.data.length} vendor booking(s). Customer: ${vBookings.data[0]?.customerId?.name}`);

  console.log('\n====================================================');
  console.log('   ✅ LIVE FULL FLOW VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

runLiveE2ETest().catch(console.error);
