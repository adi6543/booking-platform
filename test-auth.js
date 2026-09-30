const API_URL = process.env.API_URL || 'http://localhost:5000/api/auth';

async function request(endpoint, method, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('--- Auth Flow Tests ---');

  // 1. Signup Customer
  console.log('\n[1] Signing up customer...');
  const signupCustomerRes = await request('/signup', 'POST', {
    name: 'Customer John',
    email: 'customer@example.com',
    password: 'password123',
    role: 'customer'
  });
  console.log(`Status: ${signupCustomerRes.status}`);
  console.log(`Response: ${JSON.stringify(signupCustomerRes.data, null, 2)}`);
  
  // Verify password is not in response
  if (signupCustomerRes.data.user?.password) {
    console.error('ERROR: Password was returned in signup response!');
  } else {
    console.log('Success: Password not returned in response.');
  }

  // 2. Signup Vendor
  console.log('\n[2] Signing up vendor...');
  const signupVendorRes = await request('/signup', 'POST', {
    name: 'Vendor Jane',
    email: 'vendor@example.com',
    password: 'password123',
    role: 'vendor'
  });
  console.log(`Status: ${signupVendorRes.status}`);
  console.log(`Response: ${JSON.stringify(signupVendorRes.data, null, 2)}`);

  // 3. Login Customer
  console.log('\n[3] Logging in as customer...');
  const loginCustomerRes = await request('/login', 'POST', {
    email: 'customer@example.com',
    password: 'password123',
  });
  console.log(`Status: ${loginCustomerRes.status}`);
  console.log(`Response: ${JSON.stringify(loginCustomerRes.data, null, 2)}`);
  const customerToken = loginCustomerRes.data.token;

  // 4. Login Vendor
  console.log('\n[4] Logging in as vendor...');
  const loginVendorRes = await request('/login', 'POST', {
    email: 'vendor@example.com',
    password: 'password123',
  });
  console.log(`Status: ${loginVendorRes.status}`);
  console.log(`Response: ${JSON.stringify(loginVendorRes.data, null, 2)}`);
  const vendorToken = loginVendorRes.data.token;

  // 5. Hit /me with valid token
  console.log('\n[5] Hit /me WITH valid token (Customer)...');
  const meRes = await request('/me', 'GET', null, customerToken);
  console.log(`Status: ${meRes.status}`);
  console.log(`Response: ${JSON.stringify(meRes.data, null, 2)}`);
  if (meRes.data.user?.password) console.error('ERROR: Password returned in /me!');

  // 6. Hit /me without token
  console.log('\n[6] Hit /me WITHOUT token...');
  const meNoTokenRes = await request('/me', 'GET');
  console.log(`Status: ${meNoTokenRes.status}`);
  console.log(`Response: ${JSON.stringify(meNoTokenRes.data, null, 2)}`);

  // 7. Hit role-protected route with WRONG role
  console.log('\n[7] Hit /vendor-only with WRONG role (Customer)...');
  const wrongRoleRes = await request('/vendor-only', 'GET', null, customerToken);
  console.log(`Status: ${wrongRoleRes.status}`);
  console.log(`Response: ${JSON.stringify(wrongRoleRes.data, null, 2)}`);

  // 8. Hit role-protected route with RIGHT role
  console.log('\n[8] Hit /vendor-only with RIGHT role (Vendor)...');
  const rightRoleRes = await request('/vendor-only', 'GET', null, vendorToken);
  console.log(`Status: ${rightRoleRes.status}`);
  console.log(`Response: ${JSON.stringify(rightRoleRes.data, null, 2)}`);
}

runTests().catch(console.error);
