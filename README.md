# BookEasy — Full Stack Booking App

Car, House & Agent booking app built with React, Node.js/Express, PostgreSQL, and Stripe.

## Setup

### 1. PostgreSQL — create the database

```bash
psql -U postgres
CREATE DATABASE booking_app;
\q

psql -U postgres -d booking_app -f backend/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npm run dev            # runs on http://localhost:5000
```

**backend/.env**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/booking_app
JWT_SECRET=change-me-to-a-long-random-string
STRIPE_SECRET_KEY=sk_test_...
PORT=5000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in your Stripe publishable key
npm run dev            # runs on http://localhost:5173
```

**frontend/.env**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Create an admin user

After registering a regular account, update the role directly in PostgreSQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Then log in — the "Admin" link will appear in the navbar.

## Features

- Browse **Cars**, **Houses**, and **Agents**
- Calendar date picker with booked dates blocked out
- **Stripe payments** (test mode — use card `4242 4242 4242 4242`)
- JWT authentication (register / login / logout)
- **Admin panel**: add, edit, delete listings; view all bookings with revenue stats
- Cancel bookings from "My Bookings"

## Project Structure

```
booking-app/
├── backend/
│   ├── schema.sql           # PostgreSQL schema
│   ├── src/
│   │   ├── config/database.js
│   │   ├── middleware/auth.js
│   │   ├── routes/          # auth, cars, houses, agents, bookings, payments
│   │   └── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/axios.js
    │   ├── components/      # Navbar, ItemCard, CheckoutForm, ProtectedRoute
    │   ├── context/AuthContext.jsx
    │   ├── pages/           # Home, Cars, Houses, Agents, BookingDetail, MyBookings
    │   └── pages/admin/     # Dashboard, Cars, Houses, Agents, Bookings
    └── package.json
```
