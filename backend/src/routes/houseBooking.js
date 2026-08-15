const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/resendEmail');
const { formatDate } = require('../utils/dateHelper');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const router = express.Router();

const idStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const u = `hid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, u + path.extname(file.originalname));
  },
});
const uploadId = multer({
  storage: idStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

const fmtDate = formatDate;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';

const ACTIVE_STATUSES = ['payment_pending', 'pending_approval', 'approved', 'active'];

// ── DATE HELPERS ──────────────────────────────────────────────────────────────
// Add N calendar months to a YYYY-MM-DD string, clamping to the last day of the
// target month when the original day doesn't exist there (e.g. Jan 31 + 1mo → Feb 28).
function addMonthsClamped(dateStr, months) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const targetMonthIndex = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d, lastDayOfTargetMonth);
  const mm = String(targetMonth + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

function buildPaymentSchedule(moveInDate, totalMonths, monthlyRent) {
  const schedule = [];
  for (let n = 2; n <= totalMonths; n++) {
    schedule.push({
      monthNumber: n,
      dueDate: addMonthsClamped(moveInDate, n - 1),
      amount: monthlyRent,
      status: 'due',
      reminderSent: false,
      paidAt: null,
    });
  }
  return schedule;
}

function nextUnpaidDate(schedule) {
  const unpaid = (schedule || []).filter(m => m.status !== 'paid');
  if (unpaid.length === 0) return null;
  return unpaid.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0].dueDate;
}

// ── LIST HOUSES BY CITY ───────────────────────────────────────────────────────

router.get('/houses/:cityId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT h.*, ci.name as city_name, s.name as state_name, s.code as state_code
       FROM houses h
       JOIN cities ci ON h.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE h.city_id = $1 AND h.available = true
       ORDER BY h.created_at DESC`,
      [req.params.cityId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SINGLE HOUSE ─────────────────────────────────────────────────────────────

router.get('/house/:houseId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT h.*, ci.name as city_name, s.name as state_name
       FROM houses h
       JOIN cities ci ON h.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE h.id = $1`,
      [req.params.houseId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'House not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AVAILABILITY ──────────────────────────────────────────────────────────────
// A house supports one active lease at a time.

router.get('/availability/:houseId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, move_in_date, move_out_date FROM house_bookings
       WHERE house_id = $1 AND status = ANY($2::text[]) LIMIT 1`,
      [req.params.houseId, ACTIVE_STATUSES]
    );
    res.json({ available: result.rows.length === 0, activeBooking: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE BOOKING ────────────────────────────────────────────────────────────

router.post('/bookings', authenticateToken, uploadId.single('idPhoto'), async (req, res) => {
  const {
    houseId, moveInDate, numMonths,
    customerFirstName, customerLastName, customerDob,
    customerPhone, customerEmail, customerAddress,
    specialRequests, idType,
  } = req.body;

  if (!houseId || !moveInDate || !numMonths)
    return res.status(400).json({ error: 'House, move-in date, and rental duration are required' });
  if (!customerFirstName || !customerLastName || !customerPhone || !customerEmail)
    return res.status(400).json({ error: 'Customer details are required' });
  if (!idType || !req.file)
    return res.status(400).json({ error: 'ID type and photo are required' });

  const totalMonths = parseInt(numMonths);
  if (!Number.isInteger(totalMonths) || totalMonths < 1)
    return res.status(400).json({ error: 'Invalid rental duration' });

  const moveIn = new Date(String(moveInDate).slice(0, 10));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (moveIn < today) return res.status(400).json({ error: 'Move-in date cannot be in the past' });

  const idPhoto = req.file.filename;

  try {
    const hRes = await db.query('SELECT * FROM houses WHERE id = $1 AND available = true', [houseId]);
    if (!hRes.rows[0]) return res.status(404).json({ error: 'House not found or unavailable' });
    const house = hRes.rows[0];

    const minMonths = house.min_rental_months || 1;
    const maxMonths = house.max_rental_months || 12;
    if (totalMonths < minMonths || totalMonths > maxMonths)
      return res.status(400).json({ error: `Rental duration must be between ${minMonths} and ${maxMonths} months` });

    // One active lease at a time — race-condition check
    const activeCheck = await db.query(
      `SELECT id FROM house_bookings WHERE house_id = $1 AND status = ANY($2::text[]) LIMIT 1`,
      [houseId, ACTIVE_STATUSES]
    );
    if (activeCheck.rows.length > 0)
      return res.status(409).json({ error: 'This property is no longer available. Please choose a different property.' });

    const r2 = (v) => Math.round(v * 100) / 100;
    const monthlyRent  = r2(parseFloat(house.price_per_month));
    const depositAmount = r2(parseFloat(house.deposit_amount || 0));
    const totalDueToday = r2(monthlyRent + depositAmount);
    const moveOutDate   = addMonthsClamped(moveInDate, totalMonths);
    const paymentSchedule = buildPaymentSchedule(moveInDate, totalMonths, monthlyRent);
    const nextPaymentDate = nextUnpaidDate(paymentSchedule);
    const fullName = `${customerFirstName} ${customerLastName}`.trim();

    const result = await db.query(
      `INSERT INTO house_bookings (
         user_id, house_id, move_in_date, move_out_date, total_months, monthly_rent,
         deposit_amount, total_amount, next_payment_date, payment_schedule,
         status, customer_first_name, customer_last_name, customer_full_name,
         customer_dob, customer_phone, customer_email, customer_address,
         special_requests, id_type, id_photo
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'payment_pending',$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        req.user.id, houseId, moveInDate, moveOutDate, totalMonths, monthlyRent,
        depositAmount, totalDueToday, nextPaymentDate, JSON.stringify(paymentSchedule),
        customerFirstName, customerLastName, fullName,
        customerDob || null, customerPhone, customerEmail, customerAddress,
        specialRequests || null, idType, idPhoto,
      ]
    );
    const booking = result.rows[0];

    res.status(201).json({ bookingId: booking.id, totalAmount: totalDueToday });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MY BOOKINGS ───────────────────────────────────────────────────────────────

router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address, h.photos as house_photos,
              ci.name as city_name, s.name as state_name
       FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id
       JOIN cities ci ON h.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE hb.user_id = $1 ORDER BY hb.created_at DESC`,
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
      `SELECT hb.*, h.name as house_name, h.address as house_address, h.photos as house_photos,
              ci.name as city_name, s.name as state_name
       FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id
       JOIN cities ci ON h.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE hb.id = $1 AND hb.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PAYMENT INTENT ────────────────────────────────────────────────────────────

router.post('/bookings/:id/payment-intent', authenticateToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured. Please contact support.' });
  try {
    const result = await db.query(
      'SELECT * FROM house_bookings WHERE id = $1 AND user_id = $2',
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
      metadata: { bookingId: String(booking.id), userId: String(req.user.id), type: 'house' },
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
      'SELECT * FROM house_bookings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const booking = result.rows[0];
    if (booking.status !== 'payment_pending')
      return res.status(400).json({ error: 'Booking is not awaiting payment' });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded')
      return res.status(400).json({ error: 'Payment not completed' });

    await db.query(
      `UPDATE house_bookings SET status='pending_approval', stripe_payment_intent_id=$1, updated_at=NOW() WHERE id=$2`,
      [paymentIntentId, req.params.id]
    );

    const hRes = await db.query('SELECT * FROM houses WHERE id = $1', [booking.house_id]);
    const house = hRes.rows[0];
    if (house) {
      console.log('[EMAIL TRIGGER] Sending email to:', booking.customer_email);
      sendEmail({ to: booking.customer_email, subject: 'Lease Confirmed! 🏠 Orlando Superhost', html: buildConfirmEmail(booking, house) })
        .catch(e => console.error('[EMAIL] hb-confirm:', e.message));
      console.log('[EMAIL TRIGGER] Sending email to:', (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'));
      sendEmail({ to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'), subject: `New House Lease #${booking.id} — ${booking.customer_full_name}`, html: buildAdminNewEmail(booking, house) })
        .catch(e => console.error('[EMAIL] hb-admin-new:', e.message));
    }

    res.json({ bookingId: booking.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CANCEL BOOKING ────────────────────────────────────────────────────────────

router.delete('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address
       FROM house_bookings hb JOIN houses h ON hb.house_id = h.id
       WHERE hb.id = $1 AND hb.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = result.rows[0];
    if (!['payment_pending', 'pending_approval'].includes(b.status))
      return res.status(400).json({ error: 'This booking cannot be cancelled' });

    const moveInMs = new Date(b.move_in_date).getTime();
    const hoursUntilMoveIn = (moveInMs - Date.now()) / 3600000;
    const eligibleForRefund = hoursUntilMoveIn >= 24;

    let refunded = false;
    if (eligibleForRefund && b.stripe_payment_intent_id && stripe) {
      try {
        await stripe.refunds.create({ payment_intent: b.stripe_payment_intent_id });
        refunded = true;
      } catch (refundErr) {
        console.error('[STRIPE] House cancel refund error:', refundErr.message);
      }
    }

    const updated = await db.query(
      `UPDATE house_bookings SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    console.log('[EMAIL TRIGGER] Sending email to:', b.customer_email);
    sendEmail({
      to: b.customer_email,
      subject: `Lease Cancelled — ${b.house_name} (#${b.id})`,
      html: buildCustomerCancelEmail(b, eligibleForRefund, refunded),
    }).catch(e => console.error('[EMAIL] hb-customer-cancel:', e.message));

    console.log('[EMAIL TRIGGER] Sending email to:', process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com');
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
      subject: `Customer Cancelled House Lease #${b.id} — ${b.customer_full_name}`,
      html: buildAdminCancelNotifEmail(b),
    }).catch(e => console.error('[EMAIL] hb-admin-cancel-notif:', e.message));

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
table.sched{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
table.sched th{text-align:left;color:#6b6b6b;font-weight:700;padding:6px 4px;border-bottom:2px solid #E3F2FD}
table.sched td{padding:6px 4px;border-bottom:1px solid #f0f4f8}
pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;margin:0;font-size:13px;line-height:1.7}
.ft{text-align:center;padding:14px;color:#6b6b6b;font-size:12px}
</style></head><body><div class="w">
<div class="hd"><h1>${title}</h1></div>
<div class="bd">${body}</div>
<div class="ft">Orlando Superhost · Orlando, FL</div>
</div></body></html>`;
}

function scheduleTable(schedule) {
  const rows = (schedule || []);
  if (rows.length === 0) return '';
  return `<table class="sched"><tr><th>Month</th><th>Due Date</th><th style="text-align:right">Amount</th></tr>
    ${rows.map(m => `<tr><td>Month ${m.monthNumber}</td><td>${fmtDate(m.dueDate)}</td><td style="text-align:right">${money(m.amount)}</td></tr>`).join('')}
  </table>`;
}

function buildCustomerCancelEmail(b, eligibleForRefund, refunded) {
  const total = parseFloat(b.total_amount) || 0;
  return layout('Lease Cancelled 🏠', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your lease at <strong>${b.house_name}</strong> has been cancelled at your request.</p>
<div class="st">Lease Details</div>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Move In</span><span class="vl">${fmtDate(b.move_in_date)}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="row"><span class="lb">Amount Paid</span><span class="vl">${money(total)}</span></div>
<div class="st">Refund Information</div>
${eligibleForRefund ? `
<div class="ib" style="background:#E8F5E9;border-left-color:#2E7D32">
  ✅ You are eligible for a <strong>full refund</strong> of ${money(total)}.<br>
  ${refunded ? `Your refund has been processed and will appear in <strong>3–5 business days</strong>.` : `Your refund will be processed within <strong>3–5 business days</strong> to your original payment method.`}
</div>` : `
<div class="ib" style="background:#FFF3E0;border-left-color:#F57C00">
  ❌ <strong>No refund applicable</strong> — this lease was cancelled less than 24 hours before move-in.
</div>`}
<div class="ib">Questions? Email us at <strong>support@orlandosuperhost.com</strong> with booking <strong>#${b.id}</strong>.</div>`);
}

function buildAdminCancelNotifEmail(b) {
  return layout('Customer Cancelled House Lease', `
<p>Customer <strong>${b.customer_full_name}</strong> cancelled their lease.</p>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Move In</span><span class="vl">${fmtDate(b.move_in_date)}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="row"><span class="lb">Customer Email</span><span class="vl">${b.customer_email}</span></div>
<div class="row"><span class="lb">Customer Phone</span><span class="vl">${b.customer_phone}</span></div>
<div class="tot"><span>Total Amount</span><span>${money(b.total_amount)}</span></div>`);
}

function buildConfirmEmail(b, h) {
  return layout('🏠 Lease Confirmed!', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>! Your lease at <strong>${h.name}</strong> is confirmed and under review.</p>
<div class="st">Lease Details</div>
<div class="row"><span class="lb">Booking ID</span><span class="vl">#${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${h.name}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${h.address}</span></div>
<div class="row"><span class="lb">Move In</span><span class="vl">${fmtDate(b.move_in_date)}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="row"><span class="lb">Rental Period</span><span class="vl">${b.total_months} month${b.total_months !== 1 ? 's' : ''}</span></div>
<div class="st">Payment Summary</div>
<div class="row"><span class="lb">First Month Rent</span><span class="vl">${money(b.monthly_rent)}</span></div>
<div class="row"><span class="lb">Security Deposit (refundable)</span><span class="vl">${money(b.deposit_amount)}</span></div>
<div class="tot"><span>Total Paid Today</span><span>${money(b.total_amount)}</span></div>
${b.next_payment_date ? `
<div class="st">Upcoming Monthly Payments</div>
<div class="row"><span class="lb">Monthly Payment</span><span class="vl">${money(b.monthly_rent)}/month</span></div>
<div class="row"><span class="lb">Next Payment Due</span><span class="vl">${fmtDate(b.next_payment_date)}</span></div>
${scheduleTable(b.payment_schedule)}` : ''}
<div class="ib">📋 <strong>What's next?</strong><br>Our team will review your lease and send move-in details within 24 hours.</div>`);
}

function buildAdminNewEmail(b, h) {
  return layout('New House Lease', `
<p>New lease requires review.</p>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${h.name}</span></div>
<div class="row"><span class="lb">Guest</span><span class="vl">${b.customer_full_name}</span></div>
<div class="row"><span class="lb">Email</span><span class="vl">${b.customer_email}</span></div>
<div class="row"><span class="lb">Phone</span><span class="vl">${b.customer_phone}</span></div>
<div class="row"><span class="lb">Move In</span><span class="vl">${fmtDate(b.move_in_date)}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="row"><span class="lb">Rental Period</span><span class="vl">${b.total_months} month${b.total_months !== 1 ? 's' : ''}</span></div>
<div class="tot"><span>Paid Today</span><span>${money(b.total_amount)}</span></div>`);
}

module.exports = router;
