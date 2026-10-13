# BookEase — Local Services Booking Platform

A full-stack, multi-vendor neighbourhood services booking platform designed for local service marketplaces (plumbers, electricians, salons, cleaning, tutors, appliance repair, and more).

---

## 🌟 Key Features

### 1. 🛡️ Authentication & Authorization
- **Role-based Access Control**: Distinct roles for `customer` and `vendor`.
- **JWT & Password Security**: Encrypted passwords via `bcrypt`, secured JWT tokens.
- **Input Validation & Rate Limiting**: Zod schemas for input validation and `express-rate-limit` protecting authentication, booking, and payment endpoints.

### 2. 🏪 Vendor Profiles & Analytics Dashboard
- **Public Vendor Profiles (`/vendor/:id`)**: Business bio, service listings, location, star rating distributions, and verified customer reviews.
- **Vendor Dashboard (`/vendor/dashboard`)**:
  - Real-time analytics: Today's bookings, weekly revenue, average rating, cancellation rate.
  - Business Profile Management: Phone, business name, category, city, area, pin code.
  - Reviews overview tab with all incoming customer feedback.

### 3. ⭐ Customer Reviews & Ratings System
- **Verified Reviews**: Customers can submit 1–5 star ratings and reviews for confirmed and paid appointments.
- **Vendor Rating Breakdown**: Aggregate calculation with 1-to-5 star frequency distributions.
- **Interactive Review Modal**: Real-time star selection and submission directly from **My Bookings**.

### 4. 🔍 Search & Multi-Category Discovery
- **Category Browsing**: Dedicated filters for Plumbing, Salon, Cleaning, Electrician, Tutor, Appliance Repair, Painting, and Carpentry.
- **Instant Search**: Keyword search by service name, vendor, description, area, or city.
- **Interactive Slot Cards**: Real-time slot availability, price indicators in Indian Rupees (₹), and direct links to vendor profiles.

### 5. 📅 Slot Generation & Concurrency Protection
- **Automated Scheduling**: Vendors set recurring weekly schedules, blackout dates, and service durations.
- **Walk-in & Quick Pause**: "Busy Right Now" controls allow vendors to temporarily hold or unblock slots.
- **Double-Booking Guards**: MongoDB partial unique compound indexes guarantee no simultaneous slot reservation collisions.
- **10-Minute Hold Expiry**: Automatic slot release for unpaid reservation holds.

### 6. 💳 Razorpay Payments
- **Seamless Checkout**: Direct UPI, card, and netbanking integration via Razorpay.
- **Interactive Sandbox Modal**: Built-in simulated payment flow for local testing without test credentials.
- **Webhook & Server Verification**: Cryptographic HMAC signature validation.

---

## 📁 Repository Structure

```
booking-platform/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── components/          # UI components (Browse, VendorDashboard, VendorProfilePage, MyBookings, etc.)
│   │   ├── context/             # AuthContext, ToastContext, ConfirmContext
│   │   ├── lib/                 # api.js client, razorpay helpers
│   │   └── App.jsx              # Routes and application entry
│   └── package.json
├── server/                      # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/         # auth, booking, payment, review, vendor controllers
│   │   ├── middlewares/         # auth, role, rate limiter, error handling
│   │   ├── models/              # User, Service, Slot, Booking, Review schemas
│   │   ├── routes/              # Express API route modules
│   │   ├── validations/         # Zod schemas for endpoints
│   │   └── index.js             # Express server setup and routing
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or later
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI

### 1. Environment Setup
Create `.env` in both `client/` and `server/`:

**`server/.env`**:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/booking-platform
JWT_SECRET=your_jwt_secret_key_here
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=razorpay_secret_placeholder
RAZORPAY_WEBHOOK_SECRET=razorpay_webhook_secret_placeholder
```

**`client/.env`**:
```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_placeholder
```

### 2. Install Dependencies
From the repository root:
```bash
npm run install:all
```

### 3. Start Development Servers
Run both backend and frontend concurrently:
```bash
npm run dev
```
Or independently:
- **Server**: `cd server && npm run dev` (Runs on `http://localhost:5000`)
- **Client**: `cd client && npm run dev` (Runs on `http://localhost:5173`)

### 4. Build for Production
To bundle the frontend for production:
```bash
cd client && npm run build
```

---

## 📜 API Overview

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register new customer or vendor | Public (Rate-limited) |
| `POST` | `/api/auth/login` | Login user and issue JWT | Public (Rate-limited) |
| `GET` | `/api/services` | List services with filters (`?category=`, `?search=`) | Public |
| `GET` | `/api/slots` | Available slots with populated vendor info | Public |
| `POST` | `/api/bookings` | Reserve slot (initiates 10-min hold) | Customer |
| `POST` | `/api/payments/create-order` | Create Razorpay order | Customer |
| `POST` | `/api/payments/verify` | Verify payment and confirm booking | Customer |
| `POST` | `/api/reviews` | Submit rating and feedback for completed booking | Customer |
| `GET` | `/api/reviews/vendor/:vendorId` | Public vendor reviews list with pagination | Public |
| `GET` | `/api/reviews/vendor/:vendorId/summary` | Average rating and star breakdown | Public |
| `GET` | `/api/vendors/:id` | Public vendor business profile & services | Public |
| `GET` | `/api/vendors/dashboard/stats` | Vendor metrics (revenue, bookings, ratings) | Vendor |
| `PUT` | `/api/vendors/profile` | Update vendor business details & location | Vendor |
