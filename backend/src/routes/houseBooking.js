const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { formatDate, formatTime } = require('../utils/dateHelper');
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
const fmtTime = formatTime;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';

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

// ── BOOKED DATES ─────────────────────────────────────────────────────────────

const hbToMins   = t => { const [h, m] = String(t || '12:00').slice(0, 5).split(':').map(Number); return h * 60 + m; };
const hbFromMins = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

router.get('/booked-dates/:houseId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT hb.checkin_date::text, hb.checkout_date::text, h.checkout_time::text
       FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id
       WHERE hb.house_id = $1 AND hb.status NOT IN ('cancelled')`,
      [req.params.houseId]
    );
    const ranges = result.rows.map(r => {
      const gapMins = hbToMins(r.checkout_time) + 180;
      return {
        checkin_date:  r.checkin_date,
        checkout_date: r.checkout_date,
        checkout_time: r.checkout_time ? r.checkout_time.slice(0, 5) : null,
        partial_checkout_available: gapMins <= 18 * 60 ? hbFromMins(gapMins) : null,
      };
    });
    res.json(ranges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE BOOKING ────────────────────────────────────────────────────────────

router.post('/bookings', authenticateToken, uploadId.single('idPhoto'), async (req, res) => {
  const {
    houseId, checkinDate, checkoutDate, numGuests, pets,
    customerFirstName, customerLastName, customerDob,
    customerPhone, customerEmail, customerAddress,
    specialRequests, idType,
  } = req.body;

  if (!houseId || !checkinDate || !checkoutDate)
    return res.status(400).json({ error: 'House and dates are required' });
  if (!customerFirstName || !customerLastName || !customerPhone || !customerEmail)
    return res.status(400).json({ error: 'Customer details are required' });
  if (!idType || !req.file)
    return res.status(400).json({ error: 'ID type and photo are required' });

  const cin  = new Date(String(checkinDate).slice(0, 10));
  const cout = new Date(String(checkoutDate).slice(0, 10));
  if (cout <= cin) return res.status(400).json({ error: 'Check-out must be after check-in' });

  const totalNights = Math.ceil((cout - cin) / (1000 * 60 * 60 * 24));
  const idPhoto = req.file.filename;

  try {
    const hRes = await db.query('SELECT * FROM houses WHERE id = $1 AND available = true', [houseId]);
    if (!hRes.rows[0]) return res.status(404).json({ error: 'House not found or unavailable' });
    const house = hRes.rows[0];

    // Race-condition check
    const overlap = await db.query(
      `SELECT id FROM house_bookings
       WHERE house_id = $1 AND status NOT IN ('cancelled')
       AND checkin_date < $2 AND checkout_date > $3 LIMIT 1`,
      [houseId, checkoutDate, checkinDate]
    );
    if (overlap.rows.length > 0)
      return res.status(409).json({ error: 'These dates are no longer available. Please choose different dates.' });

    // 3-hour cleaning gap: if new checkin is same day as an existing checkout
    const sameDayHouse = await db.query(
      `SELECT h.checkout_time::text
       FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id
       WHERE hb.house_id = $1 AND hb.status NOT IN ('cancelled')
         AND hb.checkout_date = $2
       LIMIT 1`,
      [houseId, checkinDate]
    );
    if (sameDayHouse.rows.length > 0) {
      const checkoutMins = hbToMins(sameDayHouse.rows[0].checkout_time);
      const gapMins = checkoutMins + 180;
      if (gapMins > 18 * 60) {
        return res.status(409).json({ error: `A guest is checking out on your check-in date and the 3-hour cleaning window extends past 6:00 PM. Please book from the next available day.` });
      }
      // Gap is OK — checkin is allowed (house has time to be cleaned)
    }

    const guestsNum           = Math.max(1, parseInt(numGuests) || 1);
    const petsChecked         = pets === 'true' || pets === true;
    const r2                  = (v) => Math.round(v * 100) / 100;
    const pricePerNight       = r2(parseFloat(house.price_per_night));
    const rentalCost          = r2(pricePerNight * totalNights);
    const maxGuests           = house.max_guests || 2;
    const extraGuestFee       = r2(parseFloat(house.extra_guest_fee || 0));
    const extraGuests         = Math.max(0, guestsNum - maxGuests);
    const extraGuestFeeTotal  = r2(extraGuests * extraGuestFee * totalNights);
    const depositAmount       = r2(parseFloat(house.deposit_amount || 0));
    const totalAmount         = r2(rentalCost + extraGuestFeeTotal + depositAmount);
    const fullName            = `${customerFirstName} ${customerLastName}`.trim();

    const result = await db.query(
      `INSERT INTO house_bookings (
         user_id, house_id, checkin_date, checkout_date, total_nights, num_guests, pets,
         price_per_night, rental_cost, extra_guest_fee_total, deposit_amount, total_amount,
         status, customer_first_name, customer_last_name, customer_full_name,
         customer_dob, customer_phone, customer_email, customer_address,
         special_requests, id_type, id_photo
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'payment_pending',$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        req.user.id, houseId, checkinDate, checkoutDate, totalNights, guestsNum, petsChecked,
        pricePerNight, rentalCost, extraGuestFeeTotal, depositAmount, totalAmount,
        customerFirstName, customerLastName, fullName,
        customerDob || null, customerPhone, customerEmail, customerAddress,
        specialRequests || null, idType, idPhoto,
      ]
    );
    const booking = result.rows[0];

    res.status(201).json({ bookingId: booking.id, totalAmount });
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
      `SELECT hb.*, h.name as house_name, h.address as house_address,
              h.photos as house_photos, h.house_rules, h.checkin_instructions,
              h.checkin_time, h.checkout_time,
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
      capture_method: 'manual',
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
    if (!['requires_capture', 'succeeded'].includes(pi.status))
      return res.status(400).json({ error: 'Payment not completed' });

    await db.query(
      `UPDATE house_bookings SET status='pending_approval', stripe_payment_intent_id=$1, updated_at=NOW() WHERE id=$2`,
      [paymentIntentId, req.params.id]
    );

    const hRes = await db.query('SELECT * FROM houses WHERE id = $1', [booking.house_id]);
    const house = hRes.rows[0];
    if (house) {
      sendEmail({ to: booking.customer_email, subject: 'House Booking Confirmed! 🏠 Orlando Superhost', html: buildConfirmEmail(booking, house) })
        .catch(e => console.error('[EMAIL] hb-confirm:', e.message));
      sendEmail({ to: process.env.SMTP_USER, subject: `New House Booking #${booking.id} — ${booking.customer_full_name}`, html: buildAdminNewEmail(booking, house) })
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

    const updated = await db.query(
      `UPDATE house_bookings SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    sendEmail({
      to: b.customer_email,
      subject: `House Booking Cancelled — ${b.house_name} (#${b.id})`,
      html: buildCustomerCancelEmail(b),
    }).catch(e => console.error('[EMAIL] hb-customer-cancel:', e.message));

    sendEmail({
      to: process.env.SMTP_USER || 'orlandosuperhost@gmail.com',
      subject: `Customer Cancelled House Booking #${b.id} — ${b.customer_full_name}`,
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
pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;margin:0;font-size:13px;line-height:1.7}
.ft{text-align:center;padding:14px;color:#6b6b6b;font-size:12px}
</style></head><body><div class="w">
<div class="hd"><h1>${title}</h1></div>
<div class="bd">${body}</div>
<div class="ft">Orlando Superhost · Orlando, FL</div>
</div></body></html>`;
}

function buildCustomerCancelEmail(b) {
  const total = parseFloat(b.total_amount) || 0;
  const checkinMs = new Date(b.checkin_date).getTime();
  const hoursUntilCheckin = (checkinMs - Date.now()) / 3600000;
  const eligibleForRefund = hoursUntilCheckin >= 24;
  return layout('House Booking Cancelled 🏠', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your booking at <strong>${b.house_name}</strong> has been cancelled at your request.</p>
<div class="st">Booking Details</div>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="row"><span class="lb">Amount Paid</span><span class="vl">${money(total)}</span></div>
<div class="st">Refund Information</div>
${eligibleForRefund ? `
<div class="ib" style="background:#E8F5E9;border-left-color:#2E7D32">
  ✅ You are eligible for a <strong>full refund</strong> of ${money(total)}.<br>
  Your refund will be processed within <strong>3–5 business days</strong> to your original payment method.
</div>` : `
<div class="ib" style="background:#FFF3E0;border-left-color:#F57C00">
  ❌ <strong>No refund applicable</strong> — this booking was cancelled less than 24 hours before check-in.
</div>`}
<div class="ib">Questions? Email us at <strong>support@orlandosuperhost.com</strong> with booking <strong>#${b.id}</strong>.</div>`);
}

function buildAdminCancelNotifEmail(b) {
  return layout('Customer Cancelled House Booking', `
<p>Customer <strong>${b.customer_full_name}</strong> cancelled their booking.</p>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="row"><span class="lb">Customer Email</span><span class="vl">${b.customer_email}</span></div>
<div class="row"><span class="lb">Customer Phone</span><span class="vl">${b.customer_phone}</span></div>
<div class="tot"><span>Total Amount</span><span>${money(b.total_amount)}</span></div>`);
}

function buildConfirmEmail(b, h) {
  return layout('🏠 Booking Confirmed!', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>! Your booking at <strong>${h.name}</strong> is confirmed and under review.</p>
<div class="st">Booking Details</div>
<div class="row"><span class="lb">Booking ID</span><span class="vl">#${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${h.name}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${h.address}</span></div>
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="row"><span class="lb">Nights</span><span class="vl">${b.total_nights}</span></div>
<div class="row"><span class="lb">Guests</span><span class="vl">${b.num_guests}</span></div>
<div class="st">Price Summary</div>
<div class="row"><span class="lb">${b.total_nights} nights × ${money(b.price_per_night)}/night</span><span class="vl">${money(b.rental_cost)}</span></div>
${Number(b.extra_guest_fee_total) > 0 ? `<div class="row"><span class="lb">Extra Guest Fee</span><span class="vl">${money(b.extra_guest_fee_total)}</span></div>` : ''}
<div class="row"><span class="lb">Deposit</span><span class="vl">${money(b.deposit_amount)}</span></div>
<div class="tot"><span>Total Paid</span><span>${money(b.total_amount)}</span></div>
<div class="ib">📋 <strong>What's next?</strong><br>Our team will review your booking and send check-in details within 24 hours.</div>`);
}

function buildAdminNewEmail(b, h) {
  return layout('New House Booking', `
<p>New booking requires review.</p>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${h.name}</span></div>
<div class="row"><span class="lb">Guest</span><span class="vl">${b.customer_full_name}</span></div>
<div class="row"><span class="lb">Email</span><span class="vl">${b.customer_email}</span></div>
<div class="row"><span class="lb">Phone</span><span class="vl">${b.customer_phone}</span></div>
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="row"><span class="lb">Guests</span><span class="vl">${b.num_guests} · Pets: ${b.pets ? 'Yes' : 'No'}</span></div>
<div class="tot"><span>Total</span><span>${money(b.total_amount)}</span></div>`);
}

module.exports = router;
