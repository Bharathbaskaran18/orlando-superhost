const express = require('express');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/resendEmail');
const { addCustomerSignature } = require('../utils/pdfFill');
const { formatDate } = require('../utils/dateHelper');
const router = express.Router();

const toMins   = t => { const [h, m] = String(t).slice(0, 5).split(':').map(Number); return h * 60 + m; };
const fromMins = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = `dl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for driver license photo'));
    }
  },
});

// ─── SUBMIT BOOKING (Steps 2+3 → directly payment_pending) ──────────────────

router.post('/bookings', authenticateToken, upload.single('dlPhoto'), async (req, res) => {
  const {
    carId, pickupDate, pickupTime, returnDate, returnTime,
    customerFullName, customerDob, customerAddress, customerPhone, customerEmail,
    dlNumber, dlState, dlExpiration,
    insuranceCompany, insurancePolicyNumber, insurancePolicyExpiration,
    insuranceLiabilityLimits, insuranceCoversRental,
  } = req.body;

  if (!carId || !pickupDate || !pickupTime || !returnDate || !returnTime) {
    return res.status(400).json({ error: 'Rental dates and times are required' });
  }
  if (!customerFullName || !customerPhone || !customerEmail) {
    return res.status(400).json({ error: 'Customer details are required' });
  }

  // Return date must be after pickup date
  if (new Date(String(pickupDate).slice(0, 10)) >= new Date(String(returnDate).slice(0, 10))) {
    return res.status(400).json({ error: 'Return date must be after pickup date' });
  }

  // Operational hours: 08:00 – 18:00
  const pickupMins    = toMins(pickupTime);
  const newReturnMins = toMins(returnTime);
  if (pickupMins < 8 * 60 || pickupMins > 18 * 60)
    return res.status(400).json({ error: 'Pickup time must be between 8:00 AM and 6:00 PM' });
  if (newReturnMins < 8 * 60 || newReturnMins > 18 * 60)
    return res.status(400).json({ error: 'Return time must be between 8:00 AM and 6:00 PM' });

  // 48-hour advance booking check
  const now = new Date();
  const pickupDateTime = new Date(`${String(pickupDate).slice(0, 10)}T${String(pickupTime).slice(0, 5)}:00`);
  const hoursUntilPickup = (pickupDateTime - now) / (1000 * 60 * 60);
  if (hoursUntilPickup < 48) {
    return res.status(400).json({ error: 'Booking must be made at least 48 hours before pickup' });
  }

  try {
    const carRes = await db.query('SELECT * FROM cars WHERE id = $1 AND available = true', [carId]);
    if (carRes.rows.length === 0) return res.status(404).json({ error: 'Car not found or unavailable' });
    const car = carRes.rows[0];

    // Early availability check — catches obvious conflicts before payment
    const overlap = await db.query(
      `SELECT id FROM car_rental_bookings
       WHERE car_id = $1
       AND status NOT IN ('cancelled', 'auto_cancelled', 'completed', 'completed_with_charges', 'completed_extra_charged')
       AND NOT (return_date <= $2 OR pickup_date >= $3)
       LIMIT 1`,
      [carId, pickupDate, returnDate]
    );
    if (overlap.rows.length > 0) {
      return res.status(409).json({ error: 'Sorry, this car is no longer available for your selected dates. Please choose different dates.' });
    }

    // 3-hour gap rule: if new pickup is on same day as an existing return
    const sameDay = await db.query(
      `SELECT return_time::text FROM car_rental_bookings
       WHERE car_id = $1
         AND status NOT IN ('cancelled', 'auto_cancelled', 'completed', 'completed_with_charges', 'completed_extra_charged')
         AND return_date = $2
       LIMIT 1`,
      [carId, pickupDate]
    );
    if (sameDay.rows.length > 0) {
      const existReturnMins = toMins(sameDay.rows[0].return_time);
      const gapMins = existReturnMins + 180;
      if (gapMins > 18 * 60) {
        return res.status(409).json({ error: `A car is being returned on your pickup date and the 3-hour cleaning window extends past 6:00 PM. Please book from the next available day.` });
      }
      if (pickupMins < gapMins) {
        const gapLabel = fromMins(gapMins);
        const [gh, gm] = gapLabel.split(':').map(Number);
        const gapFmt = `${gh > 12 ? gh - 12 : gh}:${String(gm).padStart(2, '0')} ${gh >= 12 ? 'PM' : 'AM'}`;
        return res.status(409).json({ error: `This car is being returned on your pickup date. The earliest available pickup time is ${gapFmt} (3-hour cleaning gap required).` });
      }
    }

    const rp = (v) => Math.round(parseFloat(v || 0) * 100) / 100;
    const pDate = new Date(String(pickupDate).slice(0, 10));
    const rDate = new Date(String(returnDate).slice(0, 10));
    const totalDays = Math.max(1, Math.round((rDate - pDate) / (1000 * 60 * 60 * 24)));
    const dailyRate = rp(car.price_per_day);
    const rentalCost = rp(dailyRate * totalDays);
    const depositAmount = rp(car.deposit_amount || 0);
    const totalAmount = rp(rentalCost + depositAmount);
    const dlPhoto = req.file ? req.file.filename : null;

    const result = await db.query(
      `INSERT INTO car_rental_bookings
        (user_id, car_id, pickup_date, pickup_time, return_date, return_time, total_days,
         daily_rate, rental_cost, deposit_amount, total_amount, status,
         customer_full_name, customer_dob, customer_address, customer_phone, customer_email,
         dl_number, dl_state, dl_expiration, dl_photo,
         insurance_company, insurance_policy_number, insurance_policy_expiration,
         insurance_liability_limits, insurance_covers_rental)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'payment_pending',$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [
        req.user.id, carId, pickupDate, pickupTime, returnDate, returnTime, totalDays,
        dailyRate, rentalCost, depositAmount, totalAmount,
        customerFullName, customerDob || null, customerAddress || null, customerPhone, customerEmail,
        dlNumber || null, dlState || null, dlExpiration || null, dlPhoto,
        insuranceCompany || null, insurancePolicyNumber || null, insurancePolicyExpiration || null,
        insuranceLiabilityLimits || null, insuranceCoversRental || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MY BOOKINGS ─────────────────────────────────────────────────────────────

router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT crb.*,
        c.make, c.model, c.year, c.photos as car_photos,
        c.license_plate, c.deposit_amount as car_deposit,
        ci.name as city_name, s.name as state_name
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       JOIN cities ci ON c.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE crb.user_id = $1
       ORDER BY crb.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-bookings/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT crb.*,
        c.make, c.model, c.year, c.fuel_type, c.seats, c.photos as car_photos,
        c.license_plate, c.vin_number,
        c.mileage_cap_per_day, c.overage_rate_per_mile,
        c.additional_driver_fee_per_day, c.cancellation_fee,
        c.deposit_amount as car_deposit_config,
        ci.name as city_name, s.name as state_name
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       JOIN cities ci ON c.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE crb.id = $1 AND crb.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PAYMENT INTENT ───────────────────────────────────────────────────────────

router.post('/bookings/:id/payment-intent', authenticateToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payment processing is not configured. Please use test mode.' });
  try {
    const result = await db.query(
      'SELECT * FROM car_rental_bookings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = result.rows[0];
    if (booking.status !== 'payment_pending') {
      return res.status(400).json({ error: 'Booking is not awaiting payment' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(booking.total_amount) * 100),
      currency: 'usd',
      payment_method_types: ['card'],
      capture_method: 'manual',
      metadata: { bookingId: String(booking.id), userId: String(req.user.id) },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONFIRM PAYMENT ──────────────────────────────────────────────────────────

router.post('/bookings/:id/confirm-payment', authenticateToken, async (req, res) => {
  const { paymentIntentId } = req.body;
  if (!paymentIntentId) return res.status(400).json({ error: 'paymentIntentId required' });

  try {
    // Fetch booking + verify Stripe outside the transaction (read-only / external call)
    const crb = await db.query(
      `SELECT crb.*, c.make, c.model, c.year, u.customer_id, u.email as user_email
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       JOIN users u ON crb.user_id = u.id
       WHERE crb.id = $1 AND crb.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];
    console.log(`[EMAIL DEBUG] confirm-payment: booking #${booking.id} customer_email="${booking.customer_email}" user_email="${booking.user_email}"`);
    if (booking.status !== 'payment_pending') {
      return res.status(400).json({ error: 'Booking is not awaiting payment' });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!['requires_capture', 'succeeded'].includes(pi.status)) {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Transactional overlap check + confirm — prevents race conditions
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Lock the car row so concurrent confirmations for the same car are serialised
      await client.query('SELECT id FROM cars WHERE id = $1 FOR UPDATE', [booking.car_id]);

      const overlap = await client.query(
        `SELECT id FROM car_rental_bookings
         WHERE car_id = $1
         AND id != $2
         AND status NOT IN ('cancelled', 'auto_cancelled', 'completed', 'completed_with_charges', 'completed_extra_charged')
         AND NOT (return_date <= $3 OR pickup_date >= $4)
         LIMIT 1`,
        [booking.car_id, req.params.id, booking.pickup_date, booking.return_date]
      );
      if (overlap.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({ error: 'Sorry, this car is no longer available for your selected dates. Please choose different dates.' });
      }

      // 3-hour gap rule: verify same-day return/pickup gap is still valid
      const sameDayChk = await client.query(
        `SELECT return_time::text FROM car_rental_bookings
         WHERE car_id = $1 AND id != $2
           AND status NOT IN ('cancelled', 'auto_cancelled', 'completed', 'completed_with_charges', 'completed_extra_charged')
           AND return_date = $3
         LIMIT 1`,
        [booking.car_id, req.params.id, booking.pickup_date]
      );
      if (sameDayChk.rows.length > 0) {
        const gapMins = toMins(sameDayChk.rows[0].return_time) + 180;
        if (gapMins > 18 * 60 || toMins(booking.pickup_time) < gapMins) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(409).json({ error: 'The 3-hour cleaning gap rule prevents this booking from being confirmed. Please contact support.' });
        }
      }

      const bookingRow = await client.query(
        `INSERT INTO bookings (user_id, booking_type, item_id, start_date, end_date, start_time, total_price, stripe_payment_intent_id, status)
         VALUES ($1, 'car', $2, $3, $4, $5, $6, $7, 'confirmed') RETURNING *`,
        [booking.user_id, booking.car_id, booking.pickup_date, booking.return_date, booking.pickup_time, booking.total_amount, paymentIntentId]
      );

      const updated = await client.query(
        `UPDATE car_rental_bookings
         SET status='confirmed', stripe_payment_intent_id=$1, booking_id=$2, updated_at=NOW()
         WHERE id=$3 RETURNING *`,
        [paymentIntentId, bookingRow.rows[0].id, req.params.id]
      );

      await client.query('COMMIT');
      client.release();

      const customerEmail = (booking.customer_email || '').trim() || (booking.user_email || '').trim();
      console.log(`[CUSTOMER EMAIL] Sending to: ${customerEmail} Type: confirmation (booking #${booking.id})`);
      console.log(`[EMAIL DEBUG] customer_email field="${booking.customer_email}" user_email field="${booking.user_email}" resolved="${customerEmail}"`);
      sendEmail({
        to: customerEmail,
        subject: `Booking Confirmed — ${booking.year} ${booking.make} ${booking.model} (#${booking.id})`,
        html: buildReceiptHtml(booking),
      }).then(r => {
        console.log(`[CUSTOMER EMAIL] Result: ${r?.messageId || (r?.skipped ? 'skipped-smtp-not-configured' : 'unknown')} (booking #${booking.id})`);
      }).catch(err => console.error(`[CUSTOMER EMAIL] FAILED for booking #${booking.id}:`, err.message));

      sendEmail({
        to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
        subject: `New Car Rental Booking #${booking.id} — ${booking.customer_full_name}`,
        html: buildAdminNewBookingEmail(booking),
      }).catch(err => console.error(`[EMAIL] ✗ Admin new-booking FAILED for booking #${booking.id}:`, err.message));

      res.json(updated.rows[0]);
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw txErr;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TEST CONFIRM (no Stripe — for development/testing only) ─────────────────

router.post('/bookings/:id/test-confirm', authenticateToken, async (req, res) => {
  try {
    const crb = await db.query(
      `SELECT crb.*, c.make, c.model, c.year, u.customer_id, u.email as user_email
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       JOIN users u ON crb.user_id = u.id
       WHERE crb.id = $1 AND crb.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];
    console.log(`[EMAIL DEBUG] test-confirm: booking #${booking.id} customer_email="${booking.customer_email}" user_email="${booking.user_email}"`);
    if (booking.status !== 'payment_pending') {
      return res.status(400).json({ error: 'Booking is not awaiting payment' });
    }

    const fakePaymentId = `test_${Date.now()}`;

    // Transactional overlap check + confirm — prevents race conditions
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Lock the car row so concurrent confirmations for the same car are serialised
      await client.query('SELECT id FROM cars WHERE id = $1 FOR UPDATE', [booking.car_id]);

      const overlap = await client.query(
        `SELECT id FROM car_rental_bookings
         WHERE car_id = $1
         AND id != $2
         AND status NOT IN ('cancelled', 'auto_cancelled', 'completed', 'completed_with_charges', 'completed_extra_charged')
         AND NOT (return_date <= $3 OR pickup_date >= $4)
         LIMIT 1`,
        [booking.car_id, req.params.id, booking.pickup_date, booking.return_date]
      );
      if (overlap.rows.length > 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({ error: 'Sorry, this car is no longer available for your selected dates. Please choose different dates.' });
      }

      // 3-hour gap rule: verify same-day return/pickup gap is still valid
      const sameDayCheck = await client.query(
        `SELECT return_time::text FROM car_rental_bookings
         WHERE car_id = $1 AND id != $2
           AND status NOT IN ('cancelled', 'auto_cancelled', 'completed', 'completed_with_charges', 'completed_extra_charged')
           AND return_date = $3
         LIMIT 1`,
        [booking.car_id, req.params.id, booking.pickup_date]
      );
      if (sameDayCheck.rows.length > 0) {
        const gapMins = toMins(sameDayCheck.rows[0].return_time) + 180;
        if (gapMins > 18 * 60 || toMins(booking.pickup_time) < gapMins) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(409).json({ error: 'The 3-hour cleaning gap rule prevents this booking from being confirmed. Please contact support.' });
        }
      }

      const bookingRow = await client.query(
        `INSERT INTO bookings (user_id, booking_type, item_id, start_date, end_date, start_time, total_price, stripe_payment_intent_id, status)
         VALUES ($1, 'car', $2, $3, $4, $5, $6, $7, 'confirmed') RETURNING *`,
        [booking.user_id, booking.car_id, booking.pickup_date, booking.return_date, booking.pickup_time, booking.total_amount, fakePaymentId]
      );

      const updated = await client.query(
        `UPDATE car_rental_bookings
         SET status='confirmed', stripe_payment_intent_id=$1, booking_id=$2, updated_at=NOW()
         WHERE id=$3 RETURNING *`,
        [fakePaymentId, bookingRow.rows[0].id, req.params.id]
      );

      await client.query('COMMIT');
      client.release();

      const customerEmail = (booking.customer_email || '').trim() || (booking.user_email || '').trim();
      console.log(`[CUSTOMER EMAIL] Sending to: ${customerEmail} Type: test-confirm (booking #${booking.id})`);
      console.log(`[EMAIL DEBUG] customer_email field="${booking.customer_email}" user_email field="${booking.user_email}" resolved="${customerEmail}"`);
      sendEmail({
        to: customerEmail,
        subject: `Booking Confirmed — ${booking.year} ${booking.make} ${booking.model} (#${booking.id})`,
        html: buildReceiptHtml(booking),
      }).then(r => {
        console.log(`[CUSTOMER EMAIL] Result: ${r?.messageId || (r?.skipped ? 'skipped-smtp-not-configured' : 'unknown')} (booking #${booking.id})`);
      }).catch(err => console.error(`[CUSTOMER EMAIL] FAILED for booking #${booking.id}:`, err.message));

      sendEmail({
        to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
        subject: `New Car Rental Booking #${booking.id} — ${booking.customer_full_name}`,
        html: buildAdminNewBookingEmail(booking),
      }).catch(err => console.error(`[EMAIL] ✗ Admin new-booking FAILED for booking #${booking.id}:`, err.message));

      res.json(updated.rows[0]);
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw txErr;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CUSTOMER SIGN AGREEMENT ──────────────────────────────────────────────────

router.post('/bookings/:id/sign', authenticateToken, async (req, res) => {
  const { signatureName } = req.body;
  if (!signatureName || !signatureName.trim()) {
    return res.status(400).json({ error: 'Full name is required to sign' });
  }

  try {
    const crb = await db.query(
      'SELECT * FROM car_rental_bookings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (crb.rows[0].status !== 'agreement_sent') {
      return res.status(400).json({ error: 'No agreement pending signature' });
    }

    const now = new Date();

    // Add customer signature to the PDF (page 13)
    try {
      await addCustomerSignature(req.params.id, signatureName.trim(), now);
    } catch (pdfErr) {
      console.error('[PDF] Customer signature failed:', pdfErr.message);
    }

    const updated = await db.query(
      `UPDATE car_rental_bookings
       SET status='awaiting_admin_signature', customer_signature_name=$1, customer_signed_at=NOW(), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [signatureName.trim(), req.params.id]
    );

    sendEmail({
      to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
      subject: `Customer Signed Agreement — Car Rental #${req.params.id} — ${crb.rows[0].customer_full_name}`,
      html: buildAdminSignedEmail(crb.rows[0], signatureName.trim()),
    }).catch(err => console.error('[EMAIL] Admin sign notification failed:', err.message));

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CANCEL BEFORE PAYMENT ───────────────────────────────────────────────────

router.delete('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const crb = await db.query(
      `SELECT crb.*, c.make, c.model, c.year
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       WHERE crb.id = $1 AND crb.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];
    if (booking.status !== 'payment_pending') {
      return res.status(400).json({ error: 'Only unpaid bookings can be cancelled here' });
    }
    const updated = await db.query(
      `UPDATE car_rental_bookings SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    console.log(`[CUSTOMER EMAIL] Sending to: ${booking.customer_email} Type: cancel (booking #${booking.id})`);
    sendEmail({
      to: booking.customer_email,
      subject: `Booking Cancelled — ${booking.year} ${booking.make} ${booking.model} (#${booking.id})`,
      html: buildCustomerCancelEmail(booking),
    }).then(r => {
      console.log(`[CUSTOMER EMAIL] Result: ${r?.messageId || (r?.skipped ? 'skipped-smtp-not-configured' : 'unknown')} (booking #${booking.id})`);
    }).catch(err => console.error(`[CUSTOMER EMAIL] FAILED for booking #${booking.id}:`, err.message));

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BOOKED DATES (public — used by calendar to block unavailable dates) ─────

router.get('/cars/:carId/booked-dates', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pickup_date::text, return_date::text, return_time::text
       FROM car_rental_bookings
       WHERE car_id = $1
         AND status NOT IN ('cancelled', 'auto_cancelled', 'completed', 'completed_with_charges', 'completed_extra_charged')`,
      [req.params.carId]
    );
    const ranges = result.rows.map(r => {
      const gapMins = toMins(r.return_time) + 180; // + 3 hours
      return {
        pickup_date: r.pickup_date,
        return_date: r.return_date,
        return_time: r.return_time.slice(0, 5),
        partial_available_time: gapMins <= 18 * 60 ? fromMins(gapMins) : null,
      };
    });
    res.json(ranges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RECEIPT HTML ─────────────────────────────────────────────────────────────

function buildReceiptHtml(booking) {
  const fmtDate = formatDate;
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#1565C0,#1E88E5);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px">Booking Confirmed!</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Orlando Superhost — Car Rental</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p style="font-size:16px">Hi <strong>${booking.customer_full_name || 'Valued Customer'}</strong>,</p>
        <p style="color:#555;line-height:1.6">Your car rental booking has been confirmed and payment received. Here is your receipt:</p>

        ${booking.customer_id ? `
        <div style="background:#F0F7FF;border:1px solid #BBDEFB;border-radius:10px;padding:14px 18px;margin:16px 0;text-align:center">
          <p style="margin:0;font-size:12px;color:#1565C0;font-weight:700;letter-spacing:0.5px;text-transform:uppercase">Your Customer ID</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#1565C0;font-family:monospace">${booking.customer_id}</p>
        </div>` : ''}

        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;border-radius:8px;overflow:hidden">
          <tr style="background:#F8F9FA">
            <td style="padding:12px;font-weight:600;color:#555">Vehicle</td>
            <td style="padding:12px;font-weight:600">${booking.year} ${booking.make} ${booking.model}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:600;color:#555">Pickup</td>
            <td style="padding:12px">${fmtDate(booking.pickup_date)} at ${booking.pickup_time}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:12px;font-weight:600;color:#555">Return</td>
            <td style="padding:12px">${fmtDate(booking.return_date)} at ${booking.return_time}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:600;color:#555">Duration</td>
            <td style="padding:12px">${booking.total_days} day(s)</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:12px;font-weight:600;color:#555">Rental Cost</td>
            <td style="padding:12px">${money(booking.rental_cost)}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:600;color:#555">Security Deposit</td>
            <td style="padding:12px">${money(booking.deposit_amount)} (refundable)</td>
          </tr>
          <tr style="background:#E3F2FD">
            <td style="padding:12px;font-weight:800;color:#1565C0">Total Paid</td>
            <td style="padding:12px;font-weight:800;color:#1565C0;font-size:16px">${money(booking.total_amount)}</td>
          </tr>
        </table>

        <div style="background:#FFF8E1;border-left:4px solid #F57C00;padding:14px 16px;margin:16px 0;border-radius:4px">
          <strong style="color:#E65100">Cancellation Policy</strong>
          <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;line-height:1.8;color:#555">
            <li>Cancel more than 24 hours before pickup — full refund</li>
            <li>Cancel less than 24 hours before pickup — no refund</li>
            <li>No show — no refund</li>
            <li>Booking cannot be modified after payment</li>
          </ul>
        </div>

        <p style="color:#555;line-height:1.6">You will receive your rental agreement via email before your pickup date. Please bring your driver's license and a copy of this receipt.</p>
        <a href="${frontendUrl}/car-rental/rental/${booking.id}" style="display:inline-block;background:#1565C0;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px">View Booking Details</a>

        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost
        </p>
      </div>
    </div>
  `;
}

// ─── ADMIN EMAIL HELPERS ──────────────────────────────────────────────────────

function buildAdminNewBookingEmail(booking) {
  const fmtDate = formatDate;
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#1565C0,#1E88E5);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:800">New Car Rental Booking</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Orlando Superhost Admin — Action Required</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p>A new car rental booking has been confirmed and payment received.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Booking #</td>
            <td style="padding:10px;font-weight:700">#${booking.id}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Vehicle</td>
            <td style="padding:10px">${booking.year} ${booking.make} ${booking.model}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Customer</td>
            <td style="padding:10px">${booking.customer_full_name}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Email</td>
            <td style="padding:10px">${booking.customer_email}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Phone</td>
            <td style="padding:10px">${booking.customer_phone}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Pickup</td>
            <td style="padding:10px">${fmtDate(booking.pickup_date)} at ${booking.pickup_time}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Return</td>
            <td style="padding:10px">${fmtDate(booking.return_date)} at ${booking.return_time}</td>
          </tr>
          <tr style="background:#E3F2FD">
            <td style="padding:12px;font-weight:800;color:#1565C0">Total Paid</td>
            <td style="padding:12px;font-weight:800;color:#1565C0;font-size:16px">${money(booking.total_amount)}</td>
          </tr>
        </table>
        <div style="background:#FFF8E1;border-left:4px solid #F57C00;padding:14px 16px;border-radius:4px;margin:16px 0">
          <strong style="color:#E65100">Next Step</strong>
          <p style="margin:6px 0 0;font-size:13px;color:#555">Send the rental agreement PDF when the pickup date approaches.</p>
        </div>
        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost Admin
        </p>
      </div>
    </div>
  `;
}

function buildAdminSignedEmail(booking, signatureName) {
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#2e7d32,#43a047);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:800">Customer Signed the Agreement ✍️</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Awaiting Admin Countersignature — Car Rental #${booking.id}</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p>The customer has signed the rental agreement. Please log in to countersign.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Booking #</td>
            <td style="padding:10px;font-weight:700">#${booking.id}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Customer</td>
            <td style="padding:10px">${booking.customer_full_name}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Signed As</td>
            <td style="padding:10px;font-weight:700;color:#2e7d32">${signatureName}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Email</td>
            <td style="padding:10px">${booking.customer_email}</td>
          </tr>
        </table>
        <div style="background:#E8F5E9;border-left:4px solid #4CAF50;padding:14px 16px;border-radius:4px;margin:16px 0">
          <strong style="color:#2e7d32">Action Required</strong>
          <p style="margin:6px 0 0;font-size:13px;color:#555">Log in to the admin panel to review and countersign the rental agreement.</p>
        </div>
        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost Admin
        </p>
      </div>
    </div>
  `;
}

// ─── EMAIL HELPERS ────────────────────────────────────────────────────────────

function buildCustomerCancelEmail(booking) {
  const fmtDate = formatDate;
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:#c62828;color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:800">Booking Cancelled</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Orlando Superhost — Car Rental</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p style="font-size:16px">Hi <strong>${booking.customer_full_name || 'Valued Customer'}</strong>,</p>
        <p style="color:#555;line-height:1.6">
          Your booking <strong>#${booking.id}</strong> for the <strong>${booking.year} ${booking.make} ${booking.model}</strong> has been cancelled.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Booking #</td>
            <td style="padding:10px">#${booking.id}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Vehicle</td>
            <td style="padding:10px">${booking.year} ${booking.make} ${booking.model}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Pickup Date</td>
            <td style="padding:10px">${fmtDate(booking.pickup_date)}</td>
          </tr>
        </table>
        <p style="color:#555;line-height:1.6">
          If a payment was made, a refund will be processed within <strong>48 hours</strong> if eligible.
          Please contact us if you have any questions.
        </p>
        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost
        </p>
      </div>
    </div>
  `;
}

module.exports = router;
