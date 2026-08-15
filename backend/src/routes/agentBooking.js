const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/resendEmail');
const { formatDate, formatTime } = require('../utils/dateHelper');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const router = express.Router();

const idStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const u = `agid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, u + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: idStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

const fmtDate = formatDate;
const fmtTime = formatTime;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';

// ── BOOKED DATES (one booking per day blocks whole day) ──────────────────────

router.get('/booked-dates/:agentId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT booking_date::text FROM agent_bookings
       WHERE agent_id=$1 AND status NOT IN ('cancelled')`,
      [req.params.agentId]
    );
    res.json({ bookedDates: result.rows.map(r => r.booking_date) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AGENT DETAIL ─────────────────────────────────────────────────────────────

router.get('/agent/:agentId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, ci.name as city_name, s.name as state_name
       FROM agents a
       JOIN cities ci ON a.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE a.id = $1`,
      [req.params.agentId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Agent not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE BOOKING ────────────────────────────────────────────────────────────

router.post('/bookings', authenticateToken, upload.single('idPhoto'), async (req, res) => {
  const {
    agentId, bookingDate, startTime, endTime, totalHours, hourlyRate,
    rentalCost, depositAmount, totalAmount,
    customerFirstName, customerLastName, customerDob,
    customerPhone, customerEmail, customerAddress,
    idType, purpose, specialRequests,
  } = req.body;

  if (!agentId || !bookingDate || !startTime || !endTime)
    return res.status(400).json({ error: 'Agent, date, and times are required' });
  if (!customerFirstName || !customerLastName || !customerPhone || !customerEmail)
    return res.status(400).json({ error: 'Customer details are required' });
  if (!idType || !req.file)
    return res.status(400).json({ error: 'ID type and photo are required' });

  const idPhoto = req.file.filename;
  const fullName = `${customerFirstName} ${customerLastName}`.trim();
  const rp = (v) => Math.round(parseFloat(v || 0) * 100) / 100;

  try {
    // Overlap check
    const overlap = await db.query(
      `SELECT id FROM agent_bookings
       WHERE agent_id=$1 AND booking_date=$2 AND status NOT IN ('cancelled')
       AND (start_time, end_time) OVERLAPS ($3::time, $4::time)`,
      [agentId, bookingDate, startTime, endTime]
    );
    if (overlap.rows.length > 0)
      return res.status(409).json({ error: 'This time slot conflicts with an existing booking for this agent.' });

    const result = await db.query(
      `INSERT INTO agent_bookings (
         agent_id, user_id, booking_date, start_time, end_time, total_hours, hourly_rate,
         rental_cost, deposit_amount, total_amount, status,
         customer_first_name, customer_last_name, customer_full_name,
         customer_dob, customer_phone, customer_email, customer_address,
         id_type, id_photo, purpose, special_requests
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'payment_pending',$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [
        agentId, req.user.id, bookingDate, startTime, endTime,
        rp(totalHours), rp(hourlyRate),
        rp(rentalCost), rp(depositAmount), rp(totalAmount),
        customerFirstName, customerLastName, fullName,
        customerDob || null, customerPhone, customerEmail, customerAddress || null,
        idType, idPhoto,
        purpose || null, specialRequests || null,
      ]
    );
    const booking = result.rows[0];

    res.status(201).json({ bookingId: booking.id, totalAmount: booking.total_amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PAYMENT INTENT ────────────────────────────────────────────────────────────

router.post('/bookings/:id/payment-intent', authenticateToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured. Please contact support.' });
  try {
    const result = await db.query(
      'SELECT * FROM agent_bookings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const booking = result.rows[0];
    if (booking.status !== 'payment_pending')
      return res.status(400).json({ error: 'Booking is not awaiting payment' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(booking.total_amount) * 100),
      currency: 'usd',
      payment_method_types: ['card'],
      capture_method: 'manual',
      metadata: { bookingId: String(booking.id), userId: String(req.user.id), type: 'agent' },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CONFIRM PAYMENT ───────────────────────────────────────────────────────────

router.post('/bookings/:id/confirm-payment', authenticateToken, async (req, res) => {
  const { paymentIntentId } = req.body;
  if (!paymentIntentId) return res.status(400).json({ error: 'paymentIntentId required' });
  if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured' });

  try {
    const result = await db.query(
      'SELECT * FROM agent_bookings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const booking = result.rows[0];
    if (booking.status !== 'payment_pending')
      return res.status(400).json({ error: 'Booking is not awaiting payment' });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!['requires_capture', 'succeeded'].includes(pi.status))
      return res.status(400).json({ error: 'Payment not completed' });

    await db.query(
      `UPDATE agent_bookings SET status='pending_approval', stripe_payment_intent_id=$1, updated_at=NOW() WHERE id=$2`,
      [paymentIntentId, req.params.id]
    );

    // Fetch agent info for email
    const agentRes = await db.query(
      `SELECT a.name, a.specialty FROM agents a WHERE a.id = $1`,
      [booking.agent_id]
    );
    const agent = agentRes.rows[0];

    if (agent) {
      console.log('[EMAIL TRIGGER] Sending email to:', booking.customer_email);
      sendEmail({
        to: booking.customer_email,
        subject: 'Agent Booking Received! 🧭 — Orlando Superhost',
        html: buildConfirmEmail(booking, agent),
      }).catch(e => console.error('[EMAIL] ag-confirm:', e.message));

      console.log('[EMAIL TRIGGER] Sending email to:', (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'));
      sendEmail({
        to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'),
        subject: `New Agent Booking #${booking.id} — ${booking.customer_full_name}`,
        html: buildAdminNewEmail(booking, agent),
      }).catch(e => console.error('[EMAIL] ag-admin-new:', e.message));
    }

    res.json({ bookingId: booking.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MY BOOKINGS ───────────────────────────────────────────────────────────────

router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ab.*, a.name as agent_name, a.photo as agent_photo, a.specialty as agent_specialty,
              ci.name as city_name, s.name as state_name
       FROM agent_bookings ab
       JOIN agents a ON ab.agent_id = a.id
       JOIN cities ci ON a.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE ab.user_id = $1 ORDER BY ab.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── BOOKING DETAIL ────────────────────────────────────────────────────────────

router.get('/booking/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ab.*, a.name as agent_name, a.photo as agent_photo, a.specialty as agent_specialty,
              a.meeting_location, a.languages as agent_languages,
              ci.name as city_name, s.name as state_name
       FROM agent_bookings ab
       JOIN agents a ON ab.agent_id = a.id
       JOIN cities ci ON a.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE ab.id = $1 AND ab.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CANCEL BOOKING ────────────────────────────────────────────────────────────

router.delete('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ab.*, a.name as agent_name, a.specialty as agent_specialty
       FROM agent_bookings ab JOIN agents a ON ab.agent_id = a.id
       WHERE ab.id = $1 AND ab.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = result.rows[0];
    if (!['payment_pending', 'pending_approval', 'approved'].includes(b.status))
      return res.status(400).json({ error: 'This booking cannot be cancelled' });

    const updated = await db.query(
      `UPDATE agent_bookings SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    console.log('[EMAIL TRIGGER] Sending email to:', b.customer_email);
    sendEmail({
      to: b.customer_email,
      subject: `Agent Booking Cancelled — ${b.agent_name} (#${b.id})`,
      html: buildCustomerCancelEmail(b),
    }).catch(e => console.error('[EMAIL] ag-customer-cancel:', e.message));

    console.log('[EMAIL TRIGGER] Sending email to:', process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com');
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
      subject: `Customer Cancelled Agent Booking #${b.id} — ${b.customer_full_name}`,
      html: buildAdminCancelNotifEmail(b),
    }).catch(e => console.error('[EMAIL] ag-admin-cancel-notif:', e.message));

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────

function layout(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif}
.w{max-width:600px;margin:0 auto;padding:24px}
.hd{background:linear-gradient(135deg,#1565C0,#1E88E5);padding:32px;border-radius:12px 12px 0 0;text-align:center;color:white}
.hd h1{margin:0;font-size:22px;font-weight:800}
.bd{background:white;padding:28px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f4f8;font-size:14px}
.row:last-child{border-bottom:none}
.lb{color:#6b6b6b;font-weight:600}.vl{color:#1a1a1a;font-weight:500;text-align:right}
.tot{background:#E3F2FD;border-radius:8px;padding:14px;margin:14px 0;display:flex;justify-content:space-between;font-weight:800;font-size:16px;color:#1565C0}
.st{font-size:12px;font-weight:800;color:#6b6b6b;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 6px}
.ib{background:#F0F7FF;border-left:4px solid #1565C0;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.7}
.ft{text-align:center;padding:14px;color:#6b6b6b;font-size:12px}
</style></head><body><div class="w">
<div class="hd"><h1>${title}</h1></div>
<div class="bd">${body}</div>
<div class="ft">Orlando Superhost · Orlando, FL</div>
</div></body></html>`;
}

function buildCustomerCancelEmail(b) {
  return layout('Agent Booking Cancelled 🧭', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your booking with <strong>${b.agent_name}</strong> has been cancelled.</p>
<div class="st">Booking Details</div>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Agent</span><span class="vl">${b.agent_name}</span></div>
<div class="row"><span class="lb">Specialty</span><span class="vl">${b.agent_specialty}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(b.booking_date)}</span></div>
<div class="row"><span class="lb">Time</span><span class="vl">${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span></div>
<div class="row"><span class="lb">Amount Paid</span><span class="vl">${money(b.total_amount)}</span></div>
<div class="st">Refund Information</div>
<div class="ib" style="background:#E8F5E9;border-left-color:#2E7D32">
  Your refund will be processed within <strong>3–5 business days</strong> to your original payment method.
</div>
<div class="ib">Questions? Email us at <strong>support@orlandosuperhost.com</strong> with booking <strong>#${b.id}</strong>.</div>`);
}

function buildAdminCancelNotifEmail(b) {
  return layout('Customer Cancelled Agent Booking', `
<p>Customer <strong>${b.customer_full_name}</strong> cancelled their booking.</p>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Agent</span><span class="vl">${b.agent_name}</span></div>
<div class="row"><span class="lb">Specialty</span><span class="vl">${b.agent_specialty}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(b.booking_date)}</span></div>
<div class="row"><span class="lb">Time</span><span class="vl">${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span></div>
<div class="row"><span class="lb">Customer Email</span><span class="vl">${b.customer_email}</span></div>
<div class="row"><span class="lb">Customer Phone</span><span class="vl">${b.customer_phone}</span></div>
<div class="tot"><span>Amount</span><span>${money(b.total_amount)}</span></div>`);
}

function buildConfirmEmail(b, agent) {
  return layout('🧭 Agent Booking Received!', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>! Your booking with <strong>${agent.name}</strong> has been received and is pending admin approval.</p>
<div class="st">Booking Details</div>
<div class="row"><span class="lb">Booking ID</span><span class="vl">#${b.id}</span></div>
<div class="row"><span class="lb">Agent</span><span class="vl">${agent.name}</span></div>
<div class="row"><span class="lb">Specialty</span><span class="vl">${agent.specialty}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(b.booking_date)}</span></div>
<div class="row"><span class="lb">Time</span><span class="vl">${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span></div>
<div class="row"><span class="lb">Total Hours</span><span class="vl">${b.total_hours}</span></div>
<div class="tot"><span>Total</span><span>${money(b.total_amount)}</span></div>
<div class="ib">📋 <strong>What's next?</strong><br>Our team will review your booking and send you a confirmation with meeting details once approved.</div>`);
}

function buildAdminNewEmail(b, agent) {
  return layout('New Agent Booking', `
<p>New agent booking requires review.</p>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Agent</span><span class="vl">${agent.name}</span></div>
<div class="row"><span class="lb">Specialty</span><span class="vl">${agent.specialty}</span></div>
<div class="row"><span class="lb">Customer</span><span class="vl">${b.customer_full_name}</span></div>
<div class="row"><span class="lb">Email</span><span class="vl">${b.customer_email}</span></div>
<div class="row"><span class="lb">Phone</span><span class="vl">${b.customer_phone}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(b.booking_date)}</span></div>
<div class="row"><span class="lb">Time</span><span class="vl">${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span></div>
<div class="row"><span class="lb">Total Hours</span><span class="vl">${b.total_hours}</span></div>
${b.purpose ? `<div class="row"><span class="lb">Purpose</span><span class="vl">${b.purpose}</span></div>` : ''}
${b.special_requests ? `<div class="row"><span class="lb">Special Requests</span><span class="vl">${b.special_requests}</span></div>` : ''}
<div class="tot"><span>Total</span><span>${money(b.total_amount)}</span></div>`);
}

module.exports = router;
