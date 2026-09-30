# Booking Platform

A full-stack vendor booking platform - a multi-vendor local services marketplace for the Indian market.

## Phase 1: Project Setup

This project uses a monorepo-style structure:
- `/client`: React, Vite, Tailwind CSS (v4), shadcn/ui, React Router.
- `/server`: Node.js, Express, MongoDB (Mongoose).

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or a Mongo URI)

### Environment Variables
Copy the `.env.example` to `.env` in both the `client` and `server` folders and fill in the required values.
```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### Installation
Run the following command from the root folder to install dependencies for both client and server:
```bash
npm run install:all
```
*(Or install them individually in the `client` and `server` directories)*

### Running the Application (Development)
You can run both client and server concurrently from the root folder:
```bash
npm run dev
```

Alternatively, run them separately:
- **Client**: `cd client && npm run dev`
- **Server**: `cd server && npm run dev`

## Tech Stack
- Frontend: React, React Router, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, MongoDB with Mongoose
- Validation: Zod (Planned)
- Payments: Razorpay (Planned)
