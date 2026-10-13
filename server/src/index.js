require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const { authLimiter, bookingLimiter, paymentLimiter, apiLimiter } = require('./middlewares/rateLimiter');
const healthRoutes  = require('./routes/health');
const authRoutes    = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');
const serviceRoutes = require('./routes/service.routes');
const paymentRoutes = require('./routes/payment.routes');
const availabilityRoutes = require('./routes/availability.routes');
const reviewRoutes  = require('./routes/review.routes');
const vendorRoutes  = require('./routes/vendor.routes');
const chatRoutes    = require('./routes/chat.routes');
const { initScheduler } = require('./utils/scheduler');
const { autoSeedIfEmpty } = require('./utils/autoSeed');

const app = express();

const rawClientUrls = process.env.CLIENT_URL || '';
const allowedOrigins = rawClientUrls
  ? rawClientUrls.split(',').map((url) => url.trim().replace(/\/+$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (process.env.NODE_ENV !== 'production' && normalizedOrigin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} is not authorized`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Razorpay-Signature']
};

app.use(cors(corsOptions));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// General API rate limiting
app.use('/api', apiLimiter);

// Rate-limited routes
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);

// Standard routes
app.use('/api',          healthRoutes);
app.use('/api',          bookingRoutes);
app.use('/api',          availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/vendors',  vendorRoutes);
app.use('/api/chat',     chatRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await autoSeedIfEmpty();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      initScheduler();
    });
  } catch (err) {
    console.error('Fatal server boot error:', err);
    process.exit(1);
  }
}

startServer();
