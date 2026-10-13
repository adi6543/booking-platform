const rateLimit = require('express-rate-limit');

// Auth endpoints: 30 requests per minute in dev, 5 in prod
const isDev = process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login/signup attempts. Please try again after 1 minute.' }
});

// Booking creation: 10 requests per minute
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many booking requests. Please slow down.' }
});

// Payment endpoints: 10 requests per minute
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment requests. Please slow down.' }
});

// General API: 1000 requests per minute in dev, 100 in prod
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP. Please try again shortly.' }
});

module.exports = { authLimiter, bookingLimiter, paymentLimiter, apiLimiter };
