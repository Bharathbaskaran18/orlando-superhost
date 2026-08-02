# 🌴 Orlando Superhost

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/Stripe-Payments-purple?style=for-the-badge&logo=stripe" />
  <img src="https://img.shields.io/badge/Status-Live-success?style=for-the-badge" />
</p>

<p align="center">
  <strong>Florida's #1 Travel & Rental Platform</strong><br/>
  Book cars, vacation homes, travel agents, and lease properties — all in one place.
</p>

---

## ✨ What is Orlando Superhost?

Orlando Superhost is a full-stack travel and rental booking platform built for the Florida market and expanding across all 50 US states. It enables property owners and fleet managers to list their assets and accept bookings directly from travelers — with a seamless end-to-end experience from discovery to digital contract signing.

---

## 🚀 Core Features

### For Customers
- 🚗 **Car Rentals** — Browse, select dates, fill details, sign digital rental agreement, pay securely
- 🏠 **Vacation House Booking** — Search homes, check availability, book with instant confirmation
- 🧭 **Local Travel Agents** — Hire expert guides by the hour for personalized city tours
- 🏡 **Long-term Leasing** — Multi-step lease application with document upload and admin approval

### For Admins / Property Owners
- Full admin portal at `/admin/login`
- Add and manage cars, houses, agents, and lease properties
- Review bookings with full customer details and ID verification
- Send digital rental agreements and capture e-signatures
- Process car returns with damage inspection and Stripe captures
- Automated email notifications for every booking event

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL 16 |
| Payments | Stripe (Manual Capture) |
| Email | Gmail SMTP via Nodemailer |
| Auth | JWT (JSON Web Tokens) |
| Storage | Local / S3-compatible |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js v18 or higher
- PostgreSQL 16
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Bharathbaskaran18/orlando-superhost.git
cd orlando-superhost
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your values (see Environment Variables below), then:

```bash
npm run dev
```

Backend runs at `http://localhost:5001`

### 3. Set up the frontend

```bash
cd ../frontend
npm install
cp .env.example .env
```

Edit `.env` with your values, then:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Set up the database

```bash
psql -U your_postgres_username
CREATE DATABASE bookingapp;
\q
psql bookingapp < backend/src/schema.sql
```

### 5. Create your first admin

Register a normal account through the app, then promote it:

```sql
psql bookingapp
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 🔐 Environment Variables

### `backend/.env`

```env
DATABASE_URL=postgresql://username@localhost:5432/bookingapp
JWT_SECRET=your-long-random-secret
STRIPE_SECRET_KEY=sk_live_or_sk_test_...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=orlandosuperhost@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=Orlando Superhost <orlandosuperhost@gmail.com>
FRONTEND_URL=http://localhost:5173
PORT=5001
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5001
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_or_pk_test_...
VITE_UNSPLASH_ACCESS_KEY=your-unsplash-key
```

---

## 📁 Project Structure

```
orlando-superhost/
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes for all booking types
│   │   ├── middleware/       # Auth middleware
│   │   ├── utils/            # Email, PDF generation, date helpers
│   │   └── server.js         # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # User and admin pages
│   │   ├── context/          # Auth context
│   │   └── utils/            # API helpers
│   └── package.json
└── README.md
```

---

## 🌐 Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend | Railway |
| Database | Railway PostgreSQL |
| Domain | orlandosuperhost.com |
| Email | Gmail SMTP |
| Payments | Stripe |

---

## 📬 Contact

**Orlando Superhost**  
📧 orlandosuperhost@gmail.com  
🌐 [orlandosuperhost.com](https://orlandosuperhost.com)  
📍 Orlando, Florida, USA

---

<p align="center">Built with ❤️ for travelers exploring the USA</p>
