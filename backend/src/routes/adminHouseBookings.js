const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { formatDate, formatTime } = require('../utils/dateHelper');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const router = express.Router();

router.use(authenticateToken, requireAdmin);

const dmgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const u = `hdmg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    cb(null, u + path.extname(file.originalname));
  },
});
const uploadDmg = multer({
  storage: dmgStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

const fmtDate = formatDate;
const fmtTime = formatTime;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';

// ── LIST ──────────────────────────────────────────────────────────────────────

router.get('/house-bookings', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address, h.photos as house_photos,
              u.name as user_name, u.email as user_email,
              ci.name as city_name, s.name as state_name
       FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id
       JOIN users u ON hb.user_id = u.id
       JOIN cities ci ON h.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       ORDER BY hb.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DETAIL ────────────────────────────────────────────────────────────────────

router.get('/house-bookings/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address,
              h.photos as house_photos, h.house_rules, h.checkin_instructions,
              h.checkin_time, h.checkout_time, h.max_guests, h.extra_guest_fee,
              h.late_checkout_fee, h.pets_allowed,
              u.name as user_name, u.email as user_email,
              ci.name as city_name, s.name as state_name
       FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id
       JOIN users u ON hb.user_id = u.id
       JOIN cities ci ON h.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE hb.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── APPROVE ───────────────────────────────────────────────────────────────────

router.put('/house-bookings/:id/approve', async (req, res) => {
  try {
    const bRes = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address,
              h.house_rules, h.checkin_instructions, h.checkin_time, h.checkout_time, h.late_checkout_fee
       FROM house_bookings hb JOIN houses h ON hb.house_id = h.id WHERE hb.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (b.status !== 'pending_approval')
      return res.status(400).json({ error: 'Only pending bookings can be approved' });

    await db.query(`UPDATE house_bookings SET status='approved', updated_at=NOW() WHERE id=$1`, [req.params.id]);

    sendEmail({ to: b.customer_email, subject: 'Your Stay is Confirmed! ✅ Orlando Superhost', html: buildApprovalEmail(b) })
      .catch(e => console.error('[EMAIL] hb-approve:', e.message));
    sendEmail({ to: process.env.SMTP_USER, subject: `House Booking #${b.id} Approved`, html: buildAdminActionEmail('Approved', b) })
      .catch(e => console.error('[EMAIL] hb-admin-approve:', e.message));

    res.json({ message: 'Approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CANCEL ────────────────────────────────────────────────────────────────────

router.put('/house-bookings/:id/cancel', async (req, res) => {
  const { cancellationReason, cancellationNotes } = req.body || {};
  try {
    const bRes = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id WHERE hb.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (['completed', 'completed_with_charges', 'completed_extra_charged', 'cancelled'].includes(b.status))
      return res.status(400).json({ error: 'Cannot cancel this booking' });

    await db.query(`UPDATE house_bookings SET status='cancelled', updated_at=NOW() WHERE id=$1`, [req.params.id]);

    sendEmail({ to: b.customer_email, subject: 'House Booking Cancelled — Orlando Superhost', html: buildCancelEmail(b, cancellationReason, cancellationNotes) })
      .catch(e => console.error('[EMAIL] hb-cancel:', e.message));
    sendEmail({ to: process.env.SMTP_USER, subject: `[Admin Cancelled] House Booking #${b.id} — ${b.customer_full_name}`, html: buildAdminActionEmail('Cancelled', b) })
      .catch(e => console.error('[EMAIL] hb-admin-cancel:', e.message));

    res.json({ message: 'Cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CHECK IN ──────────────────────────────────────────────────────────────────

router.put('/house-bookings/:id/checkin', async (req, res) => {
  try {
    const bRes = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address
       FROM house_bookings hb JOIN houses h ON hb.house_id = h.id WHERE hb.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (b.status !== 'approved')
      return res.status(400).json({ error: 'Booking must be approved before check-in' });

    await db.query(`UPDATE house_bookings SET status='checked_in', updated_at=NOW() WHERE id=$1`, [req.params.id]);

    sendEmail({ to: b.customer_email, subject: 'Welcome! You Are Checked In 🏠 — Orlando Superhost', html: buildCheckinEmail(b) })
      .catch(e => console.error('[EMAIL] hb-checkin:', e.message));
    sendEmail({ to: process.env.SMTP_USER, subject: `Guest Checked In — Booking #${b.id}`, html: buildAdminActionEmail('Checked In', b) })
      .catch(e => console.error('[EMAIL] hb-admin-checkin:', e.message));

    res.json({ message: 'Checked in' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CHECKOUT ──────────────────────────────────────────────────────────────────

router.post('/house-bookings/:id/checkout', uploadDmg.array('damagePhotos', 10), async (req, res) => {
  const {
    actualCheckoutDate, actualCheckoutTime, actualNumGuests,
    propertyCondition, damageDescription, damageRepairCost,
    cleaningFee, checkoutNotes,
  } = req.body;

  try {
    const bRes = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address, h.checkout_time,
              h.max_guests, h.extra_guest_fee, h.late_checkout_fee
       FROM house_bookings hb JOIN houses h ON hb.house_id = h.id WHERE hb.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (!['checked_in', 'approved'].includes(b.status))
      return res.status(400).json({ error: 'Cannot process checkout for this booking' });

    const damagePhotos = req.files ? req.files.map(f => f.filename) : [];

    // Late checkout fee
    const [sh, sm] = String(b.checkout_time || '11:00:00').split(':').map(Number);
    let lateCheckoutFeeCharged = 0;
    if (actualCheckoutTime) {
      const [ah, am] = String(actualCheckoutTime).split(':').map(Number);
      const diffHours = Math.max(0, Math.ceil(((ah * 60 + am) - (sh * 60 + sm)) / 60));
      if (diffHours > 0) lateCheckoutFeeCharged = diffHours * parseFloat(b.late_checkout_fee || 25);
    }

    // Extra guest fee
    const actualGuests    = Math.max(1, parseInt(actualNumGuests) || b.num_guests);
    const extraGuests     = Math.max(0, actualGuests - (b.max_guests || 2));
    const actualExtraGuestFee = extraGuests * parseFloat(b.extra_guest_fee || 0) * b.total_nights;

    const repairCost   = parseFloat(damageRepairCost) || 0;
    const cleaning     = parseFloat(cleaningFee) || 0;
    const totalCharges = lateCheckoutFeeCharged + actualExtraGuestFee + repairCost + cleaning;
    const deposit      = parseFloat(b.deposit_amount) || 0;

    const finalStatus = totalCharges === 0 ? 'completed'
      : totalCharges <= deposit ? 'completed_with_charges'
      : 'completed_extra_charged';

    // ── Stripe: capture payment and handle deposit/charges ────────────────────
    let extraChargeStripeId = null;
    let stripeNote = null;

    if (b.stripe_payment_intent_id && stripe) {
      try {
        if (finalStatus === 'completed_extra_charged') {
          // Capture full amount (rental + deposit), then charge extra
          await stripe.paymentIntents.capture(b.stripe_payment_intent_id);
          const extraAmount = parseFloat((totalCharges - deposit).toFixed(2));
          try {
            const origPi = await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
            if (origPi.payment_method) {
              const extraPi = await stripe.paymentIntents.create({
                amount: Math.round(extraAmount * 100),
                currency: 'usd',
                payment_method: origPi.payment_method,
                payment_method_types: ['card'],
                confirm: true,
                off_session: true,
                capture_method: 'automatic',
                description: `Extra charges — House Booking #${b.id}`,
              });
              extraChargeStripeId = extraPi.id;
            } else {
              stripeNote = `Extra charge of $${extraAmount.toFixed(2)} could not be collected automatically. Collect manually.`;
            }
          } catch (extraErr) {
            stripeNote = `Extra charge of $${extraAmount.toFixed(2)} failed: ${extraErr.message}. Collect manually.`;
          }
        } else {
          // Capture only rental + applicable charges (releases remainder of deposit hold)
          const captureAmount = Math.round((parseFloat(b.rental_cost) + Math.min(totalCharges, deposit)) * 100);
          await stripe.paymentIntents.capture(b.stripe_payment_intent_id, {
            amount_to_capture: captureAmount,
          });
        }
      } catch (stripeErr) {
        console.error('[STRIPE] House checkout capture error:', stripeErr.message);
        stripeNote = `Stripe capture failed: ${stripeErr.message}. Process manually.`;
      }
    }

    await db.query(
      `UPDATE house_bookings SET
         status=$1, actual_checkout_date=$2, actual_checkout_time=$3, actual_num_guests=$4,
         property_condition=$5, damage_description=$6, damage_photos=$7,
         damage_repair_cost=$8, cleaning_fee=$9, late_checkout_fee_charged=$10,
         actual_extra_guest_fee=$11, checkout_notes=$12, updated_at=NOW()
       WHERE id=$13`,
      [
        finalStatus, actualCheckoutDate || null, actualCheckoutTime || null, actualGuests,
        propertyCondition || 'good', damageDescription || null, JSON.stringify(damagePhotos),
        repairCost || null, cleaning || null, lateCheckoutFeeCharged || null,
        actualExtraGuestFee || null, [checkoutNotes, stripeNote].filter(Boolean).join('\n') || null, req.params.id,
      ]
    );

    if (finalStatus === 'completed') {
      sendEmail({ to: b.customer_email, subject: 'Thank You for Staying With Us! 🏠 Orlando Superhost', html: buildCheckoutCleanEmail(b, deposit) })
        .catch(e => console.error('[EMAIL] hb-checkout:', e.message));
    } else {
      const extraAmount = Math.max(0, totalCharges - deposit);
      const refund      = Math.max(0, deposit - totalCharges);
      sendEmail({
        to: b.customer_email,
        subject: finalStatus === 'completed_extra_charged'
          ? 'Additional Charge Applied ⚠️ — Orlando Superhost'
          : 'Checkout Complete - Charges Applied ⚠️ — Orlando Superhost',
        html: buildCheckoutChargesEmail(b, { totalCharges, deposit, repairCost, cleaning, lateCheckoutFeeCharged, actualExtraGuestFee, refund, extraAmount, damagePhotos, damageDescription }),
      }).catch(e => console.error('[EMAIL] hb-checkout-charges:', e.message));
    }
    sendEmail({ to: process.env.SMTP_USER, subject: `Guest Checked Out — Booking #${b.id}`, html: buildAdminCheckoutEmail(b, finalStatus, totalCharges, deposit) })
      .catch(e => console.error('[EMAIL] hb-admin-checkout:', e.message));

    res.json({ status: finalStatus, totalCharges, depositHeld: deposit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EMAIL HELPERS ─────────────────────────────────────────────────────────────

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
.ref{background:#E8F5E9;border-radius:8px;padding:14px;margin:8px 0;display:flex;justify-content:space-between;font-weight:800;font-size:15px;color:#2E7D32}
.ext{background:#FFEBEE;border-radius:8px;padding:14px;margin:8px 0;display:flex;justify-content:space-between;font-weight:800;font-size:15px;color:#C62828}
.st{font-size:12px;font-weight:800;color:#6b6b6b;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 6px}
.ib{background:#F0F7FF;border-left:4px solid #1565C0;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.7}
.wb{background:#FFF8E1;border-left:4px solid #F57C00;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.6}
pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;margin:0;font-size:13px;line-height:1.7}
.ft{text-align:center;padding:14px;color:#6b6b6b;font-size:12px}
</style></head><body><div class="w">
<div class="hd"><h1>${title}</h1></div>
<div class="bd">${body}</div>
<div class="ft">Orlando Superhost · Orlando, FL</div>
</div></body></html>`;
}

function buildApprovalEmail(b) {
  const cin  = b.checkin_time  ? fmtTime(b.checkin_time)  : '3:00 PM';
  const cout = b.checkout_time ? fmtTime(b.checkout_time) : '11:00 AM';
  const rules = b.house_rules || 'Please follow all house rules.';
  const instr = b.checkin_instructions || 'Check-in details will be provided.';
  const fee   = b.late_checkout_fee ? `$${Number(b.late_checkout_fee).toFixed(2)}/hr` : '$25/hr';

  return layout('🏠 Your Stay is Confirmed!', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>! Your booking at <strong>${b.house_name}</strong> is confirmed.</p>
<div class="st">Stay Details</div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${b.house_address}</span></div>
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)} from ${cin}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)} by ${cout}</span></div>
<div class="row"><span class="lb">Guests</span><span class="vl">${b.num_guests}${b.pets ? ' · Pets: Yes' : ''}</span></div>
<div class="st">Check-In Instructions</div>
<div class="ib"><pre>${instr}</pre></div>
<div class="st">House Rules</div>
<div class="ib"><pre>${rules}</pre></div>
<div class="wb">🔔 <strong>Cancellation Policy</strong><br>Cancel 24+ hours before check-in = Full refund<br>Cancel less than 24 hours = No refund · No show = No refund<br>Late checkout = ${fee}</div>`);
}

function buildCancelEmail(b, reason, notes) {
  const checkinMs = new Date(b.checkin_date).getTime();
  const hoursUntilCheckin = (checkinMs - Date.now()) / 3600000;
  const eligibleForRefund = hoursUntilCheckin >= 24;
  const deposit = parseFloat(b.deposit_amount) || 0;
  const total   = parseFloat(b.total_amount)   || 0;

  return layout('House Booking Cancelled 🏠', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your booking at <strong>${b.house_name}</strong> has been cancelled.</p>
<div class="st">Booking Details</div>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
${b.house_address ? `<div class="row"><span class="lb">Address</span><span class="vl">${b.house_address}</span></div>` : ''}
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="row"><span class="lb">Guests</span><span class="vl">${b.num_guests}${b.pets ? ' · Pets: Yes' : ''}</span></div>
<div class="row"><span class="lb">Amount Paid</span><span class="vl">${money(total)}</span></div>
${reason ? `
<div class="st">Cancellation Reason</div>
<div class="ib" style="background:#FFF3E0;border-left-color:#F57C00">
  <strong>${reason}</strong>${notes ? `<br><br>${notes}` : ''}
</div>` : ''}
<div class="st">Refund Information</div>
${eligibleForRefund ? `
<div class="ref"><span>✅ Deposit Refund</span><span>${money(deposit)}</span></div>
<div class="ref"><span>✅ Rental Refund</span><span>${money(parseFloat(b.rental_cost) || 0)}</span></div>
<div class="ib" style="background:#E8F5E9;border-left-color:#2E7D32">
  ✅ You are eligible for a <strong>full refund</strong> of ${money(total)}.<br>
  Your refund will be processed within <strong>3–5 business days</strong> to your original payment method.
</div>` : `
<div class="wb">
  ❌ <strong>No refund applicable</strong> — this booking was cancelled less than 24 hours before check-in.<br>
  Per our cancellation policy, bookings cancelled within 24 hours of check-in are non-refundable.
</div>`}
<div class="ib">Questions or disputes? Email us at <strong>support@orlandosuperhost.com</strong> with your booking number <strong>#${b.id}</strong>.</div>`);
}

function buildCheckinEmail(b) {
  return layout('Welcome! You Are Checked In 🏠', `
<p>Hi <strong>${b.customer_first_name}</strong>, you are now officially checked in at <strong>${b.house_name}</strong>!</p>
<div class="row"><span class="lb">Address</span><span class="vl">${b.house_address}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="ib">🏡 Enjoy your stay! Contact us immediately if you have any issues.</div>`);
}

function buildCheckoutCleanEmail(b, deposit) {
  const rentalCost    = parseFloat(b.rental_cost)         || 0;
  const extraGuestFee = parseFloat(b.extra_guest_fee_total) || 0;
  const pricePerNight = parseFloat(b.price_per_night)     || 0;
  const nights        = parseInt(b.total_nights)          || 0;

  return layout('Thank You for Staying With Us! 🏠', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your checkout is complete. Thank you for choosing us!</p>
<div class="st">Stay Summary</div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
${b.house_address ? `<div class="row"><span class="lb">Address</span><span class="vl">${b.house_address}</span></div>` : ''}
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="row"><span class="lb">Nights Stayed</span><span class="vl">${nights} night${nights !== 1 ? 's' : ''}</span></div>
<div class="row"><span class="lb">Guests</span><span class="vl">${b.num_guests}${b.pets ? ' · Pets: Yes' : ''}</span></div>
<div class="st">Charge Breakdown</div>
<div class="row"><span class="lb">${nights} nights × ${money(pricePerNight)}/night</span><span class="vl">${money(rentalCost)}</span></div>
${extraGuestFee > 0 ? `<div class="row"><span class="lb">Extra Guest Fee</span><span class="vl">${money(extraGuestFee)}</span></div>` : ''}
<div class="row"><span class="lb">Late Checkout Fee</span><span class="vl">$0.00</span></div>
<div class="row"><span class="lb">Damage / Cleaning Fees</span><span class="vl">$0.00</span></div>
<div class="row" style="font-weight:700"><span class="lb">Checkout Charges</span><span class="vl" style="color:#2E7D32">$0.00 ✅</span></div>
<div class="st">Deposit Settlement</div>
<div class="row"><span class="lb">Deposit Paid</span><span class="vl">${money(deposit)}</span></div>
<div class="row"><span class="lb">Amount Deducted</span><span class="vl">$0.00</span></div>
${deposit > 0 ? `<div class="ref"><span>Deposit Refund</span><span>${money(deposit)}</span></div>` : ''}
<div class="ib" style="background:#E8F5E9;border-left-color:#2E7D32">
  ✅ No additional charges were applied. ${deposit > 0 ? `Your deposit of <strong>${money(deposit)}</strong> will be refunded within <strong>48 hours</strong> to your original payment method.` : ''}
</div>
<div class="ib">🙏 We hope you had a wonderful stay! We'd love to host you again.</div>
<div class="ib">Questions about your stay? Contact us at <strong>support@orlandosuperhost.com</strong> with booking <strong>#${b.id}</strong>.</div>`);
}

function buildCheckoutChargesEmail(b, c) {
  const isExtra   = c.extraAmount > 0;
  const nights    = parseInt(b.total_nights) || 0;
  const pricePer  = parseFloat(b.price_per_night) || 0;
  const deducted  = Math.min(c.deposit, c.totalCharges);

  return layout(isExtra ? 'Additional Charge Applied ⚠️' : 'Checkout Complete — Charges Applied', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your checkout is complete. Please review the charge summary below.</p>
<div class="st">Stay Summary</div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
${b.house_address ? `<div class="row"><span class="lb">Address</span><span class="vl">${b.house_address}</span></div>` : ''}
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="row"><span class="lb">Nights Stayed</span><span class="vl">${nights} night${nights !== 1 ? 's' : ''}</span></div>
<div class="row"><span class="lb">Guests</span><span class="vl">${b.num_guests}${b.pets ? ' · Pets: Yes' : ''}</span></div>
<div class="st">Charge Breakdown</div>
<div class="row"><span class="lb">${nights} nights × ${money(pricePer)}/night (paid)</span><span class="vl">${money(b.rental_cost)}</span></div>
${c.actualExtraGuestFee > 0 ? `<div class="row"><span class="lb">Extra Guest Fee</span><span class="vl">${money(c.actualExtraGuestFee)}</span></div>` : ''}
${c.lateCheckoutFeeCharged > 0 ? `<div class="row"><span class="lb">Late Checkout Fee</span><span class="vl">${money(c.lateCheckoutFeeCharged)}</span></div>` : ''}
${c.cleaning > 0 ? `<div class="row"><span class="lb">Cleaning Fee</span><span class="vl">${money(c.cleaning)}</span></div>` : ''}
${c.repairCost > 0 ? `<div class="row"><span class="lb">Damage Repair</span><span class="vl">${money(c.repairCost)}</span></div>` : ''}
<div class="row" style="font-weight:800"><span class="lb">Total Checkout Charges</span><span class="vl" style="color:#C62828">$${c.totalCharges.toFixed(2)}</span></div>
<div class="st">Deposit Settlement</div>
<div class="row"><span class="lb">Deposit Paid</span><span class="vl">${money(c.deposit)}</span></div>
<div class="row"><span class="lb">Amount Deducted from Deposit</span><span class="vl">$${deducted.toFixed(2)}</span></div>
${c.refund > 0 ? `<div class="ref"><span>✅ Deposit Refund</span><span>$${c.refund.toFixed(2)}</span></div>` : ''}
${isExtra ? `<div class="ext"><span>⚠️ Additional Charge Due</span><span>$${c.extraAmount.toFixed(2)}</span></div>` : ''}
${c.damageDescription ? `<div class="st">Damage Notes</div><div class="wb"><pre>${c.damageDescription}</pre></div>` : ''}
<div class="ib" style="${c.refund > 0 ? 'background:#E8F5E9;border-left-color:#2E7D32' : 'background:#FFF3E0;border-left-color:#F57C00'}">
  ${c.refund > 0
    ? `✅ Your deposit refund of <strong>$${c.refund.toFixed(2)}</strong> will be processed within <strong>48 hours</strong> to your original payment method.`
    : isExtra
      ? `⚠️ An additional charge of <strong>$${c.extraAmount.toFixed(2)}</strong> will be collected via your payment method on file within 48 hours.`
      : ''}
</div>
<div class="ib">Questions about these charges? Contact us at <strong>support@orlandosuperhost.com</strong> with booking <strong>#${b.id}</strong> within 7 days.</div>`);
}

function buildAdminActionEmail(action, b) {
  return layout(`House Booking ${action}`, `
<p>Booking <strong>#${b.id}</strong> — ${action}</p>
<div class="row"><span class="lb">Guest</span><span class="vl">${b.customer_full_name}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Check In</span><span class="vl">${fmtDate(b.checkin_date)}</span></div>
<div class="row"><span class="lb">Check Out</span><span class="vl">${fmtDate(b.checkout_date)}</span></div>
<div class="tot"><span>Total</span><span>${money(b.total_amount)}</span></div>`);
}

function buildAdminCheckoutEmail(b, status, totalCharges, deposit) {
  return layout('Guest Checked Out', `
<p>Guest checked out of <strong>${b.house_name}</strong>.</p>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Guest</span><span class="vl">${b.customer_full_name}</span></div>
<div class="row"><span class="lb">Status</span><span class="vl">${status}</span></div>
<div class="row"><span class="lb">Total Charges</span><span class="vl">$${totalCharges.toFixed(2)}</span></div>
<div class="row"><span class="lb">Deposit Held</span><span class="vl">${money(deposit)}</span></div>`);
}

module.exports = router;
