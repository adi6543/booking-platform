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
export const getServices = () =>
  request('GET', '/services');

export const getVendorServices = (token) =>
  request('GET', '/services/mine', { token });

export const createService = (token, name, price) =>
  request('POST', '/services', { token, body: { name, price } });

export const deleteService = (token, serviceId) =>
  request('DELETE', `/services/${serviceId}`, { token });

// ── Payments ─────────────────────────────────────────────────────────────────
export const createPaymentOrder = (token, bookingId) =>
  request('POST', '/payments/create-order', { token, body: { bookingId } });

export const verifyPayment = (token, paymentData) =>
  request('POST', '/payments/verify', { token, body: paymentData });

export const cancelPaymentOrder = (token, bookingId) =>
  request('POST', '/payments/cancel', { token, body: { bookingId } });
