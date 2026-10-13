/**
 * Centralized API client for the booking platform.
 * Base URL read from VITE_API_URL env var (set in client/.env).
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const BASE = API_BASE_URL;

function getHeaders(token, includeJson = true) {
  const h = {};
  if (includeJson) h['Content-Type'] = 'application/json';
  if (token)        h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: getHeaders(token, !!body),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || data.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── Slots ─────────────────────────────────────────────────────────────────────
export const createSlot = (token, body) =>
  request('POST', '/slots', { token, body });

export const getAvailableSlots = ({ vendorId, serviceId } = {}) => {
  const params = new URLSearchParams();
  if (vendorId)  params.append('vendorId', vendorId);
  if (serviceId) params.append('serviceId', serviceId);
  const qs = params.toString() ? `?${params}` : '';
  return request('GET', `/slots${qs}`);
};

export const getVendorSlots = (token, serviceId) => {
  const qs = serviceId ? `?serviceId=${serviceId}` : '';
  return request('GET', `/slots/vendor${qs}`, { token });
};

export const deleteSlot = (token, slotId) =>
  request('DELETE', `/slots/${slotId}`, { token });

// ── Feature 2: "Busy Right Now" & Slot Blocking ──────────────────────────────
export const toggleBlockSlot = (token, slotId, isBlocked, reason) =>
  request('PATCH', `/slots/${slotId}/block`, { token, body: { isBlocked, reason } });

export const pauseVendor = (token, minutes, reason) =>
  request('POST', '/vendor/pause', { token, body: { minutes, reason } });

export const resumeVendor = (token) =>
  request('POST', '/vendor/resume', { token });

export const getPauseStatus = (token) =>
  request('GET', '/vendor/pause-status', { token });

// ── Feature 1: Recurring Weekly Availability ─────────────────────────────────
export const getVendorAvailability = (token) =>
  request('GET', '/vendor/availability', { token });

export const saveVendorAvailability = (token, data) =>
  request('POST', '/vendor/availability', { token, body: data });

export const deleteVendorAvailability = (token, id) =>
  request('DELETE', `/vendor/availability/${id}`, { token });

export const generateVendorSlots = (token) =>
  request('POST', '/vendor/availability/generate', { token });

// ── Feature 1: Blackout Dates (Closures / Holidays) ──────────────────────────
export const getVendorBlackouts = (token) =>
  request('GET', '/vendor/blackouts', { token });

export const addVendorBlackout = (token, data) =>
  request('POST', '/vendor/blackouts', { token, body: data });

export const deleteVendorBlackout = (token, id) =>
  request('DELETE', `/vendor/blackouts/${id}`, { token });

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookSlot = (token, slotId) =>
  request('POST', '/bookings', { token, body: { slotId } });

export const getMyBookings = (token) =>
  request('GET', '/bookings/me', { token });

export const getVendorBookings = (token) =>
  request('GET', '/vendor/bookings', { token });

export const cancelBooking = (token, bookingId) =>
  request('PATCH', `/bookings/${bookingId}/cancel`, { token });

// ── Services ─────────────────────────────────────────────────────────────────
export const getServices = ({ search, category, vendorId } = {}) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (vendorId) params.append('vendorId', vendorId);
  const qs = params.toString() ? `?${params}` : '';
  return request('GET', `/services${qs}`);
};

export const getVendorServices = (token) =>
  request('GET', '/services/mine', { token });

export const createService = (token, { name, price, description, category }) =>
  request('POST', '/services', { token, body: { name, price, description, category } });

export const updateService = (token, serviceId, data) =>
  request('PUT', `/services/${serviceId}`, { token, body: data });

export const deleteService = (token, serviceId) =>
  request('DELETE', `/services/${serviceId}`, { token });

// ── Payments ─────────────────────────────────────────────────────────────────
export const createPaymentOrder = (token, bookingId) =>
  request('POST', '/payments/create-order', { token, body: { bookingId } });

export const verifyPayment = (token, paymentData) =>
  request('POST', '/payments/verify', { token, body: paymentData });

export const cancelPaymentOrder = (token, bookingId) =>
  request('POST', '/payments/cancel', { token, body: { bookingId } });

// ── Reviews ──────────────────────────────────────────────────────────────────
export const createReview = (token, { bookingId, rating, comment }) =>
  request('POST', '/reviews', { token, body: { bookingId, rating, comment } });

export const getVendorReviews = (vendorId, { page = 1, limit = 10 } = {}) =>
  request('GET', `/reviews/vendor/${vendorId}?page=${page}&limit=${limit}`);

export const getVendorRatingSummary = (vendorId) =>
  request('GET', `/reviews/vendor/${vendorId}/summary`);

export const getMyReviews = (token) =>
  request('GET', '/reviews/me', { token });

export const getVendorOwnReviews = (token) =>
  request('GET', '/reviews/vendor-dashboard', { token });

// ── Vendors ──────────────────────────────────────────────────────────────────
export const listVendors = ({ category, city, search } = {}) => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (city) params.append('city', city);
  if (search) params.append('search', search);
  const qs = params.toString() ? `?${params}` : '';
  return request('GET', `/vendors${qs}`);
};

export const getVendorProfile = (vendorId) =>
  request('GET', `/vendors/${vendorId}`);

export const updateVendorProfile = (token, data) =>
  request('PUT', '/vendors/profile', { token, body: data });

export const getVendorDashboardStats = (token) =>
  request('GET', '/vendors/dashboard/stats', { token });

// ── ChatBot ──────────────────────────────────────────────────────────────────
export const sendChatMessage = (message, history = []) =>
  request('POST', '/chat', { body: { message, history } });
