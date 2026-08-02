const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { generateRentalAgreement, addAdminSignature } = require('../utils/pdfFill');
const { formatDate, formatTime } = require('../utils/dateHelper');
const router = express.Router();

const damagePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = `damage-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const uploadDamagePhotos = multer({
  storage: damagePhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.use(authenticateToken, requireAdmin);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtDate = formatDate;
const fmtTime = formatTime;

const opt = (v) => (v != null ? String(v) : 'N/A');
const money = (v) => (v != null ? `$${Number(v).toFixed(2)}` : 'N/A');
const safeJsonParse = (val) => {
  try {
    if (!val || val === '' || val === 'null') return [];
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
};

// ─── PDF GENERATION ───────────────────────────────────────────────────────────

function generatePDF(booking, car) {
  return new Promise((resolve, reject) => {
    const filename = `rental-agreement-${booking.id}.pdf`;
    const outputPath = path.join(__dirname, '../../uploads', filename);
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    const hr = () => {
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(565, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc.moveDown(0.3);
    };
    const section = (title) => {
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1565C0').text(title.toUpperCase());
      hr();
    };
    const row = (label, value) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#555555').text(`${label}:  `, { continued: true })
        .font('Helvetica').fillColor('#1a1a1a').text(String(value));
    };

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1565C0').text('CAR RENTAL AGREEMENT', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#555555').text(
      `Agreement #${booking.id}  ·  Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      { align: 'center' }
    );
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(565, doc.y).strokeColor('#1565C0').lineWidth(2).stroke();
    doc.moveDown(0.5);

    section('Vehicle Information');
    row('Make / Model / Year', `${car.make} ${car.model} (${car.year})`);
    if (car.license_plate) row('License Plate', car.license_plate);
    if (car.vin_number)    row('VIN', car.vin_number);

    section('Rental Period');
    row('Pickup', `${fmtDate(booking.pickup_date)} at ${fmtTime(booking.pickup_time)}`);
    row('Return', `${fmtDate(booking.return_date)} at ${fmtTime(booking.return_time)}`);
    row('Duration', `${booking.total_days} day(s)`);

    section('Pricing Summary');
    row('Daily Rate',    money(booking.daily_rate));
    row('Rental Cost',   `${booking.total_days} days × ${money(booking.daily_rate)} = ${money(booking.rental_cost)}`);
    row('Deposit',       money(booking.deposit_amount));
    doc.moveDown(0.2);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1565C0').text(`TOTAL PAID: ${money(booking.total_amount)}`, { indent: 10 });
    doc.fontSize(10).font('Helvetica').fillColor('#1a1a1a');
    if (car.mileage_cap_per_day)           row('Mileage Cap',            `${car.mileage_cap_per_day} miles/day`);
    if (car.overage_rate_per_mile)         row('Overage Rate',           `${money(car.overage_rate_per_mile)}/mile`);
    if (car.additional_driver_fee_per_day) row('Additional Driver Fee',  `${money(car.additional_driver_fee_per_day)}/day`);
    if (car.cancellation_fee)              row('Cancellation Fee',        money(car.cancellation_fee));

    section('Renter Information');
    row('Full Name', opt(booking.customer_full_name));
    if (booking.customer_dob)     row('Date of Birth', fmtDate(booking.customer_dob));
    if (booking.customer_address) row('Address', opt(booking.customer_address));
    if (booking.customer_phone)   row('Phone', opt(booking.customer_phone));
    if (booking.customer_email)   row('Email', opt(booking.customer_email));

    section("Driver's License");
    if (booking.dl_number)     row('License Number', opt(booking.dl_number));
    if (booking.dl_state)      row('Issuing State',  opt(booking.dl_state));
    if (booking.dl_expiration) row('Expiration',     fmtDate(booking.dl_expiration));

    section('Insurance Information');
    if (booking.insurance_company)           row('Company',           opt(booking.insurance_company));
    if (booking.insurance_policy_number)     row('Policy Number',     opt(booking.insurance_policy_number));
    if (booking.insurance_policy_expiration) row('Policy Expiration', fmtDate(booking.insurance_policy_expiration));
    if (booking.insurance_liability_limits)  row('Liability Limits',  opt(booking.insurance_liability_limits));
    if (booking.insurance_covers_rental != null) {
      const covers = String(booking.insurance_covers_rental);
      row('Covers Rental', covers.charAt(0).toUpperCase() + covers.slice(1));
    }

    section('Vehicle Condition at Pickup');
    row('Odometer Reading', booking.odometer_at_pickup != null ? `${booking.odometer_at_pickup} miles` : 'N/A');
    row('Fuel Level',       opt(booking.fuel_level_at_pickup));
    if (booking.admin_notes) row('Notes', opt(booking.admin_notes));

    section('Cancellation Policy');
    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    doc.text('• Cancel more than 24 hours before pickup: full refund', { indent: 8, lineGap: 2 });
    doc.text('• Cancel less than 24 hours before pickup: no refund', { indent: 8, lineGap: 2 });
    doc.text('• No show: no refund', { indent: 8, lineGap: 2 });
    doc.text('• Booking cannot be modified after payment', { indent: 8, lineGap: 2 });

    section('Terms and Conditions');
    const terms = [
      '1. The renter agrees to return the vehicle in the same condition as received.',
      '2. The renter is responsible for all traffic violations or parking fines during the rental period.',
      '3. A valid driver\'s license must be presented at pickup.',
      '4. Smoking and pets are strictly prohibited in the vehicle.',
      '5. The vehicle may not be used for illegal activities or sub-rented to a third party.',
      '6. Any mileage beyond the daily cap will be charged at the overage rate specified above.',
      '7. Late returns are charged at $25.00 per hour.',
      '8. The deposit will be refunded within 48 hours upon return in satisfactory condition.',
      '9. Damage to the vehicle will be deducted from the deposit; remaining deposit refunded.',
      '10. This agreement constitutes the entire rental contract between the renter and the rental company.',
    ];
    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    terms.forEach(t => doc.text(t, { indent: 8, lineGap: 2 }));

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(565, doc.y).strokeColor('#1565C0').lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1565C0').text('SIGNATURES');
    doc.moveDown(1.5);
    doc.fontSize(10).font('Helvetica').fillColor('#1a1a1a');
    doc.text('Renter Signature: _________________________________    Date: _______________');
    doc.moveDown(2);
    doc.text('Agent Signature:   _________________________________    Date: _______________');

    doc.end();
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}

// ─── EXPIRING AGREEMENTS (< 2 hours left to sign) ───────────────────────────

router.get('/car-rental/expiring-agreements', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT crb.id, crb.customer_full_name, crb.customer_email,
              crb.pickup_date, crb.return_date, crb.total_amount,
              crb.rental_agreement_sent_at,
              c.make, c.model, c.year
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       WHERE crb.status = 'agreement_sent'
       AND crb.rental_agreement_sent_at < NOW() - INTERVAL '22 hours'
       AND crb.rental_agreement_sent_at > NOW() - INTERVAL '24 hours'
       ORDER BY crb.rental_agreement_sent_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LIST BOOKINGS ────────────────────────────────────────────────────────────

router.get('/car-rental/bookings', async (req, res) => {
  const { status } = req.query;
  try {
    let query = `SELECT crb.*,
      u.name as user_name, u.email as user_email,
      c.make, c.model, c.year, c.license_plate,
      ci.name as city_name, s.name as state_name
     FROM car_rental_bookings crb
     JOIN users u ON crb.user_id = u.id
     JOIN cars c ON crb.car_id = c.id
     JOIN cities ci ON c.city_id = ci.id
     JOIN states s ON ci.state_id = s.id`;
    const params = [];
    if (status) { query += ' WHERE crb.status = $1'; params.push(status); }
    query += ' ORDER BY crb.updated_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/car-rental/bookings/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT crb.*,
        u.name as user_name, u.email as user_email,
        c.make, c.model, c.year, c.fuel_type, c.seats, c.photos as car_photos,
        c.license_plate, c.vin_number, c.price_per_day,
        c.mileage_cap_per_day, c.overage_rate_per_mile,
        c.additional_driver_fee_per_day, c.cancellation_fee,
        ci.name as city_name, s.name as state_name
       FROM car_rental_bookings crb
       JOIN users u ON crb.user_id = u.id
       JOIN cars c ON crb.car_id = c.id
       JOIN cities ci ON c.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE crb.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SEND RENTAL AGREEMENT (admin action on confirmed bookings) ───────────────

router.put('/car-rental/bookings/:id/send-agreement', async (req, res) => {
  const { odometerAtPickup, fuelLevelAtPickup, adminNotes } = req.body;
  try {
    const crb = await db.query(
      `SELECT crb.*, c.make, c.model, c.year, c.license_plate, c.vin_number, c.price_per_day,
              c.mileage_cap_per_day, c.overage_rate_per_mile, c.additional_driver_fee_per_day,
              c.cancellation_fee, c.deposit_amount as car_deposit
       FROM car_rental_bookings crb JOIN cars c ON crb.car_id = c.id WHERE crb.id = $1`,
      [req.params.id]
    );
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking must be confirmed before sending agreement' });
    }

    // Merge pickup/fuel into booking object for PDF generation
    const forPdf = {
      ...booking,
      odometer_at_pickup: odometerAtPickup != null ? parseInt(odometerAtPickup) : booking.odometer_at_pickup,
      fuel_level_at_pickup: fuelLevelAtPickup || booking.fuel_level_at_pickup,
      admin_notes: adminNotes || booking.admin_notes,
    };

    // Use the Orlando Travels template to generate the filled agreement
    const pdfFilename = await generateRentalAgreement(forPdf, booking);

    const updated = await db.query(
      `UPDATE car_rental_bookings
       SET status='agreement_sent',
           odometer_at_pickup=$1, fuel_level_at_pickup=$2, admin_notes=$3,
           rental_agreement_pdf=$4, rental_agreement_sent_at=NOW(), updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [
        odometerAtPickup != null ? parseInt(odometerAtPickup) : null,
        fuelLevelAtPickup || null,
        adminNotes || null,
        pdfFilename,
        req.params.id,
      ]
    );

    // Email rental agreement to customer
    const pdfPath = path.join(__dirname, '../../uploads', pdfFilename);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    sendEmail({
      to: booking.customer_email,
      subject: `Your Rental Agreement — ${booking.year} ${booking.make} ${booking.model} (#${booking.id})`,
      html: buildAgreementEmailHtml(booking, frontendUrl),
      attachments: [{ filename: `rental-agreement-${booking.id}.pdf`, path: pdfPath }],
    }).catch(err => console.error('[EMAIL] Agreement send failed:', err.message));

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN SIGN AGREEMENT ────────────────────────────────────────────────────

router.put('/car-rental/bookings/:id/admin-sign', async (req, res) => {
  const { adminSignatureName, adminSignatureTitle } = req.body;
  if (!adminSignatureName || !adminSignatureTitle) {
    return res.status(400).json({ error: 'Name and title are required' });
  }
  try {
    const crb = await db.query(
      `SELECT crb.*,
              c.make, c.model, c.year, c.photos as car_photos,
              u.customer_id,
              ci.name as city_name, s.name as state_name
       FROM car_rental_bookings crb
       JOIN cars c    ON crb.car_id   = c.id
       JOIN users u   ON crb.user_id  = u.id
       JOIN cities ci ON c.city_id    = ci.id
       JOIN states s  ON ci.state_id  = s.id
       WHERE crb.id = $1`,
      [req.params.id]
    );
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];
    if (booking.status !== 'awaiting_admin_signature') {
      return res.status(400).json({ error: 'Booking is not awaiting admin signature' });
    }

    const now = new Date();
    await addAdminSignature(booking.id, adminSignatureName, adminSignatureTitle, now);

    const updated = await db.query(
      `UPDATE car_rental_bookings
       SET status='agreement_complete', admin_signature_name=$1, admin_signature_title=$2,
           admin_signed_at=NOW(), updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [adminSignatureName, adminSignatureTitle, req.params.id]
    );

    // Send "Your Car is Ready for Pickup!" email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log(`[EMAIL] Triggering pickup-ready email → ${booking.customer_email} (booking #${booking.id})`);
    sendEmail({
      to: booking.customer_email,
      subject: `Your Car is Ready for Pickup! 🚗 — ${booking.year} ${booking.make} ${booking.model}`,
      html: buildPickupReadyEmail(booking, frontendUrl),
    }).then(r => {
      if (!r?.skipped) console.log(`[EMAIL] ✓ Pickup-ready email delivered for booking #${booking.id}`);
    }).catch(err => console.error(`[EMAIL] ✗ Pickup-ready email FAILED for booking #${booking.id}:`, err.message));

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CANCEL BOOKING ───────────────────────────────────────────────────────────

router.put('/car-rental/bookings/:id/cancel', async (req, res) => {
  try {
    const crb = await db.query(
      `SELECT crb.*, c.make, c.model, c.year
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       WHERE crb.id = $1`,
      [req.params.id]
    );
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];

    const result = await db.query(
      `UPDATE car_rental_bookings SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    sendEmail({
      to: booking.customer_email,
      subject: `Your Booking Has Been Cancelled — ${booking.year} ${booking.make} ${booking.model} (#${booking.id})`,
      html: buildAdminCancelEmail(booking),
    }).catch(err => console.error('[EMAIL] Admin cancel email failed:', err.message));

    sendEmail({
      to: process.env.SMTP_USER || 'orlandosuperhost@gmail.com',
      subject: `[Admin Cancelled] Car Rental #${booking.id} — ${booking.customer_full_name}`,
      html: buildAdminCancelSelfCopyEmail(booking),
    }).catch(err => console.error('[EMAIL] Admin cancel self-copy failed:', err.message));

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MARK RETURNED ────────────────────────────────────────────────────────────

router.put('/car-rental/bookings/:id/mark-returned', async (req, res) => {
  const { isLate, lateHours } = req.body;
  const LATE_FEE_PER_HOUR = 25;

  try {
    const crb = await db.query('SELECT * FROM car_rental_bookings WHERE id = $1', [req.params.id]);
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];

    if (!['confirmed', 'agreement_sent', 'awaiting_admin_signature', 'agreement_complete'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking cannot be marked as returned in its current state' });
    }

    const hours = isLate && lateHours ? parseFloat(lateHours) : null;
    const lateFee = hours ? parseFloat((hours * LATE_FEE_PER_HOUR).toFixed(2)) : null;

    const updated = await db.query(
      `UPDATE car_rental_bookings
       SET status='returned', returned_at=NOW(),
           is_late_return=$1, late_return_hours=$2, late_return_fee=$3,
           updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [isLate ? true : false, hours, lateFee, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REFUND DEPOSIT ───────────────────────────────────────────────────────────

router.put('/car-rental/bookings/:id/refund-deposit', async (req, res) => {
  const { damageAmount } = req.body;
  try {
    const crb = await db.query('SELECT * FROM car_rental_bookings WHERE id = $1', [req.params.id]);
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];

    if (booking.status !== 'returned') {
      return res.status(400).json({ error: 'Car must be returned before refunding deposit' });
    }
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured — process refund manually.' });
    if (booking.deposit_refund_status === 'refunded' || booking.deposit_refund_status === 'partial_refunded') {
      return res.status(400).json({ error: 'Deposit has already been refunded' });
    }

    const deposit = parseFloat(Number(booking.deposit_amount).toFixed(2));
    const damage = parseFloat(Number(damageAmount || 0).toFixed(2));
    const refundAmount = Math.max(0, deposit - damage);
    let stripeRefundId = null;
    let refundStatus = 'withheld';

    if (refundAmount > 0 && booking.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
        });
        stripeRefundId = refund.id;
        refundStatus = damage > 0 ? 'partial_refunded' : 'refunded';
      } catch (stripeErr) {
        console.error('[STRIPE] Refund failed:', stripeErr.message);
        return res.status(500).json({ error: `Stripe refund failed: ${stripeErr.message}` });
      }
    } else if (refundAmount === 0) {
      refundStatus = 'withheld';
    }

    const updated = await db.query(
      `UPDATE car_rental_bookings
       SET status='completed', damage_amount=$1,
           deposit_refunded_amount=$2, deposit_refund_status=$3, deposit_stripe_refund_id=$4,
           updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [damage, refundAmount, refundStatus, stripeRefundId, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PAYMENT RECEIPT PDF ─────────────────────────────────────────────────────

router.get('/car-rental/bookings/:id/receipt', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT crb.*,
        u.name as user_name, u.email as user_email,
        c.make, c.model, c.year
       FROM car_rental_bookings crb
       JOIN users u ON crb.user_id = u.id
       JOIN cars c ON crb.car_id = c.id
       WHERE crb.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = result.rows[0];

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${b.id}.pdf"`);
    doc.pipe(res);

    const hr = () => {
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(565, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc.moveDown(0.3);
    };
    const row = (label, value) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#555555').text(`${label}:  `, { continued: true })
        .font('Helvetica').fillColor('#1a1a1a').text(String(value || 'N/A'));
    };

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1565C0').text('PAYMENT RECEIPT', { align: 'center' });
    doc.fontSize(11).font('Helvetica').fillColor('#555555').text(
      `Receipt #${b.id}  ·  Orlando Superhost — Car Rental`,
      { align: 'center' }
    );
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(565, doc.y).strokeColor('#1565C0').lineWidth(2).stroke();
    doc.moveDown(0.8);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1565C0').text('BOOKING INFORMATION');
    hr();
    row('Booking #', `#${b.id}`);
    row('Status', b.status ? b.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'N/A');
    row('Payment ID', b.stripe_payment_intent_id || 'N/A');
    row('Booking Date', b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A');

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1565C0').text('VEHICLE');
    hr();
    row('Car', `${b.year} ${b.make} ${b.model}`);

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1565C0').text('RENTAL PERIOD');
    hr();
    row('Pickup', `${fmtDate(b.pickup_date)} at ${fmtTime(b.pickup_time)}`);
    row('Return', `${fmtDate(b.return_date)} at ${fmtTime(b.return_time)}`);
    row('Duration', `${b.total_days} day(s)`);

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1565C0').text('CUSTOMER');
    hr();
    row('Name', b.customer_full_name || b.user_name);
    row('Email', b.customer_email || b.user_email);
    if (b.customer_phone) row('Phone', b.customer_phone);

    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1565C0').text('PAYMENT SUMMARY');
    hr();
    row('Daily Rate', money(b.daily_rate));
    row('Rental Cost', money(b.rental_cost));
    row('Security Deposit', money(b.deposit_amount));
    doc.moveDown(0.3);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1565C0').text(`TOTAL PAID: ${money(b.total_amount)}`, { indent: 10 });

    doc.moveDown(1.5);
    doc.fontSize(9).font('Helvetica').fillColor('#888888').text(
      `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · Orlando Superhost`,
      { align: 'center' }
    );

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MARK AS PICKED UP ───────────────────────────────────────────────────────

router.put('/car-rental/bookings/:id/mark-pickup', async (req, res) => {
  try {
    const crb = await db.query(
      `SELECT crb.*, c.make, c.model, c.year
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       WHERE crb.id = $1`,
      [req.params.id]
    );
    if (crb.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = crb.rows[0];

    const CONFIRMABLE = ['confirmed', 'agreement_sent', 'awaiting_admin_signature', 'agreement_complete'];
    if (!CONFIRMABLE.includes(booking.status)) {
      return res.status(400).json({ error: 'Booking cannot be marked as picked up in its current state' });
    }

    const updated = await db.query(
      `UPDATE car_rental_bookings SET status='active_car_out', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    sendEmail({
      to: booking.customer_email,
      subject: `Your Rental Has Started! 🚗 — ${booking.year} ${booking.make} ${booking.model}`,
      html: buildTripStartedEmail(booking, frontendUrl),
    }).catch(err => console.error('[EMAIL] Trip started email failed:', err.message));

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PROCESS RETURN (unified return processing) ───────────────────────────────

router.put('/car-rental/bookings/:id/process-return', async (req, res) => {
  console.log('[RETURN] Route hit - booking id:', req.params.id);

  try {
    await new Promise((resolve) => {
      uploadDamagePhotos.array('damagePhotos', 10)(req, res, (err) => {
        if (err) {
          console.error('[RETURN] Multer error (continuing without photos):', err.message);
          req.files = [];
        }
        resolve();
      });
    });

    console.log('[RETURN] Body received:', JSON.stringify(req.body));

    const {
      actualReturnDate, actualReturnTime, odometerAtReturn,
      fuelLevelAtReturn, fuelFee, conditionAtReturn,
      damageDescription, damageRepairCost, returnNotes, returnType,
    } = req.body || {};

    console.log(`[RETURN] ── Booking #${req.params.id} ──────────────────────────────`);
    console.log(`[RETURN] returnType: ${returnType}`);
    console.log(`[RETURN] Fields received:`, {
      actualReturnDate, actualReturnTime, odometerAtReturn,
      fuelLevelAtReturn, fuelFee, conditionAtReturn,
      damageDescription: damageDescription ? `"${String(damageDescription).slice(0,60)}"` : '(empty)',
      damageRepairCost, returnNotes: returnNotes ? '(set)' : '(empty)',
      filesUploaded: req.files?.length || 0,
      userId: req.user?.id,
    });

    if (!actualReturnDate || !actualReturnTime || !odometerAtReturn || !fuelLevelAtReturn || !conditionAtReturn) {
      const missing = ['actualReturnDate','actualReturnTime','odometerAtReturn','fuelLevelAtReturn','conditionAtReturn']
        .filter(k => !(req.body || {})[k]);
      console.log(`[RETURN] ✗ Validation failed — missing fields: ${missing.join(', ')}`);
      console.log(`[RETURN] Sending 400 response`);
      return res.status(400).json({ error: `Required fields missing: ${missing.join(', ')}` });
    }

    // Verify key return columns exist before running the UPDATE
    const colCheck = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name='car_rental_bookings'
       AND column_name IN ('actual_return_date','actual_return_time','odometer_at_return',
                           'fuel_level_at_return','fuel_fee','condition_at_return',
                           'extra_charge_amount','return_completed_at','return_type',
                           'extra_charge_stripe_id','extra_miles_driven','extra_mileage_fee')`
    );
    const foundCols = colCheck.rows.map(r => r.column_name);
    console.log(`[RETURN] Column check (${foundCols.length}/12 found): ${foundCols.join(', ')}`);
    if (foundCols.length < 12) {
      const missing = ['actual_return_date','actual_return_time','odometer_at_return',
        'fuel_level_at_return','fuel_fee','condition_at_return',
        'extra_charge_amount','return_completed_at','return_type',
        'extra_charge_stripe_id','extra_miles_driven','extra_mileage_fee']
        .filter(c => !foundCols.includes(c));
      console.error(`[RETURN] ✗ Missing DB columns: ${missing.join(', ')}`);
      console.log(`[RETURN] Sending 500 response — missing columns`);
      return res.status(500).json({ error: `Database schema missing columns: ${missing.join(', ')}. Run car_rental_schema_v3.sql migration.` });
    }

    const crb = await db.query(
      `SELECT crb.*, c.make, c.model, c.year, c.mileage_cap_per_day, c.overage_rate_per_mile
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       WHERE crb.id = $1`,
      [req.params.id]
    );
    if (crb.rows.length === 0) {
      console.log(`[RETURN] ✗ Booking #${req.params.id} not found in DB`);
      console.log(`[RETURN] Sending 404 response`);
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = crb.rows[0];
    console.log(`[RETURN] Booking found — status: ${booking.status}, car: ${booking.year} ${booking.make} ${booking.model}`);

    const RETURNABLE = ['confirmed', 'agreement_sent', 'awaiting_admin_signature', 'agreement_complete', 'active_car_out'];
    if (!RETURNABLE.includes(booking.status)) {
      console.log(`[RETURN] ✗ Status "${booking.status}" is not returnable`);
      console.log(`[RETURN] Sending 400 response — wrong status`);
      return res.status(400).json({ error: `Cannot process return: booking status is "${booking.status}"` });
    }

    // Late fee calculation
    const LATE_FEE_PER_HOUR = 25;
    const bookedReturn = new Date(`${String(booking.return_date).slice(0, 10)}T${String(booking.return_time).slice(0, 5)}`);
    const actualReturn = new Date(`${actualReturnDate}T${actualReturnTime}`);
    const diffMs = actualReturn - bookedReturn;
    let lateHours = 0, calculatedLateFee = 0;
    if (diffMs > 0) {
      lateHours = Math.ceil(diffMs / (1000 * 60 * 60));
      calculatedLateFee = parseFloat((lateHours * LATE_FEE_PER_HOUR).toFixed(2));
    }

    // Extra mileage calculation
    const odomAtPickup = booking.odometer_at_pickup || 0;
    const odomAtReturn = parseInt(odometerAtReturn);
    const mileageCapPerDay = parseFloat(booking.mileage_cap_per_day || 0);
    const overageRatePerMile = parseFloat(booking.overage_rate_per_mile || 0);
    let extraMiles = 0, calculatedExtraMileageFee = 0;
    if (booking.odometer_at_pickup != null && mileageCapPerDay > 0) {
      const totalMilesDriven = Math.max(0, odomAtReturn - odomAtPickup);
      const allowedMiles = parseFloat((mileageCapPerDay * booking.total_days).toFixed(2));
      extraMiles = Math.max(0, totalMilesDriven - allowedMiles);
      calculatedExtraMileageFee = parseFloat((extraMiles * overageRatePerMile).toFixed(2));
    }

    const fuelFeeNum = parseFloat(Number(fuelFee || 0).toFixed(2));
    const isDamaged = conditionAtReturn === 'Damaged';
    const damageRepairCostNum = isDamaged ? parseFloat(Number(damageRepairCost || 0).toFixed(2)) : 0;
    const totalDeductions = parseFloat((calculatedLateFee + calculatedExtraMileageFee + fuelFeeNum + damageRepairCostNum).toFixed(2));
    const deposit = parseFloat(Number(booking.deposit_amount).toFixed(2));
    const depositRefund = parseFloat(Math.max(0, deposit - totalDeductions).toFixed(2));
    const extraChargeAmount = parseFloat(Math.max(0, totalDeductions - deposit).toFixed(2));

    console.log(`[RETURN] Calculations:`, {
      lateHours, calculatedLateFee, extraMiles, calculatedExtraMileageFee,
      fuelFeeNum, damageRepairCostNum, totalDeductions,
      deposit, depositRefund, extraChargeAmount,
    });

    const damagePhotos = req.files ? req.files.map(f => f.filename) : [];

    // ── Stripe: capture payment and handle deposit/extra charges ──────────────
    let stripeRefundId = null;
    let depositRefundStatus = 'withheld';
    let extraChargeStripeId = null;
    let stripeNote = null;

    if (booking.stripe_payment_intent_id && stripe) {
      try {
        if (extraChargeAmount > 0) {
          // Capture the full authorized amount (rental + deposit)
          await stripe.paymentIntents.capture(booking.stripe_payment_intent_id);
          depositRefundStatus = 'withheld';

          // Attempt off-session extra charge using same payment method
          try {
            const origPi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
            if (origPi.payment_method) {
              const extraPi = await stripe.paymentIntents.create({
                amount: Math.round(extraChargeAmount * 100),
                currency: 'usd',
                payment_method: origPi.payment_method,
                payment_method_types: ['card'],
                confirm: true,
                off_session: true,
                capture_method: 'automatic',
                description: `Extra charges — Car Rental #${booking.id}`,
              });
              extraChargeStripeId = extraPi.id;
            } else {
              stripeNote = `Extra charge of $${extraChargeAmount.toFixed(2)} could not be collected automatically — no payment method on file. Collect manually.`;
            }
          } catch (extraErr) {
            stripeNote = `Extra charge of $${extraChargeAmount.toFixed(2)} failed: ${extraErr.message}. Collect manually.`;
            console.error('[STRIPE] Extra charge failed:', extraErr.message);
          }
        } else {
          // Capture only rental + applicable charges (deposit remainder is released automatically)
          const captureAmount = Math.round((parseFloat(booking.rental_cost) + Math.min(totalDeductions, deposit)) * 100);
          await stripe.paymentIntents.capture(booking.stripe_payment_intent_id, {
            amount_to_capture: captureAmount,
          });
          depositRefundStatus = depositRefund > 0 ? 'refunded' : 'withheld';
        }
      } catch (stripeErr) {
        console.error('[STRIPE] Capture error:', stripeErr.message);
        stripeNote = `Stripe capture failed: ${stripeErr.message}. Process manually.`;
        depositRefundStatus = 'pending';
      }
    } else if (!booking.stripe_payment_intent_id) {
      depositRefundStatus = depositRefund > 0 ? 'pending' : 'withheld';
      stripeNote = depositRefund > 0
        ? `No Stripe payment on file. Refund $${depositRefund.toFixed(2)} deposit manually.`
        : null;
    }

    const finalReturnNotes = [returnNotes || null, stripeNote].filter(Boolean).join('\n') || null;

    const finalStatus = returnType === 'with_charges' ? 'completed_with_charges' : 'completed';
    console.log(`[RETURN] Writing to DB — finalStatus: ${finalStatus}, extraChargeAmount: ${extraChargeAmount}`);

    const updated = await db.query(
      `UPDATE car_rental_bookings
       SET status=$1,
           actual_return_date=$2, actual_return_time=$3, odometer_at_return=$4,
           fuel_level_at_return=$5, fuel_fee=$6,
           condition_at_return=$7, damage_description=$8, damage_photos=$9, damage_amount=$10,
           return_notes=$11,
           is_late_return=$12, late_return_hours=$13, late_return_fee=$14,
           extra_miles_driven=$15, extra_mileage_fee=$16,
           deposit_refunded_amount=$17, deposit_refund_status=$18,
           deposit_stripe_refund_id=$19, extra_charge_amount=$20, return_type=$21,
           extra_charge_stripe_id=$22,
           return_completed_at=NOW(), returned_at=NOW(), updated_at=NOW()
       WHERE id=$23 RETURNING *`,
      [
        finalStatus,
        actualReturnDate, actualReturnTime, odomAtReturn,
        fuelLevelAtReturn, fuelFeeNum,
        conditionAtReturn, damageDescription || null, JSON.stringify(damagePhotos), damageRepairCostNum,
        finalReturnNotes,
        lateHours > 0, lateHours || null, calculatedLateFee,
        extraMiles, calculatedExtraMileageFee,
        depositRefund, depositRefundStatus,
        stripeRefundId, extraChargeAmount, returnType,
        extraChargeStripeId,
        req.params.id,
      ]
    );

    console.log(`[RETURN] UPDATE complete — rows returned: ${updated.rows.length}`);

    // Guard before using updated.rows[0] — must come before emailData construction
    if (!updated.rows[0]) {
      console.error(`[RETURN] ✗ UPDATE returned no rows for booking #${req.params.id}`);
      console.log(`[RETURN] Sending 500 response — no rows from UPDATE`);
      return res.status(500).json({ error: 'Return processed but booking record not found after update.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const emailData = {
      ...updated.rows[0],
      make: booking.make, model: booking.model, year: booking.year,
      lateHours, calculatedLateFee, extraMiles, calculatedExtraMileageFee,
      fuelFeeNum, damageRepairCostNum, totalDeductions, depositRefund, extraChargeAmount,
      extraChargeStripeId,
      mileageCapPerDay,
      overageRatePerMile,
      odomAtPickup: booking.odometer_at_pickup,
    };
    if (extraChargeAmount > 0) {
      const damageAttachments = damagePhotos
        .map(photo => ({ filename: photo, path: path.join(__dirname, '../../uploads', photo) }))
        .filter(a => fs.existsSync(a.path));
      console.log(`[EMAIL] Sending extra-charge return email → ${booking.customer_email} (booking #${booking.id})`);
      sendEmail({
        to: booking.customer_email,
        subject: `Return Complete — Additional Charge Applied ⚠️ — ${booking.year} ${booking.make} ${booking.model} (#${booking.id})`,
        html: buildExtraChargeEmail(emailData, frontendUrl),
        attachments: damageAttachments,
      }).then(r => {
        if (!r?.skipped) console.log(`[EMAIL] ✓ Extra-charge return email delivered for booking #${booking.id}`);
      }).catch(err => console.error('[EMAIL] Extra charge email failed:', err.message));
    } else {
      console.log(`[EMAIL] Sending return summary email → ${booking.customer_email} (booking #${booking.id})`);
      sendEmail({
        to: booking.customer_email,
        subject: `Your Car Has Been Returned Successfully ✅ — ${booking.year} ${booking.make} ${booking.model} (#${booking.id})`,
        html: buildReturnSummaryEmail(emailData, frontendUrl),
      }).then(r => {
        if (!r?.skipped) console.log(`[EMAIL] ✓ Return summary email delivered for booking #${booking.id}`);
      }).catch(err => console.error('[EMAIL] Return summary failed:', err.message));
    }

    sendEmail({
      to: process.env.SMTP_USER || 'orlandosuperhost@gmail.com',
      subject: `Car Returned — Booking #${req.params.id} — ${booking.year} ${booking.make} ${booking.model}`,
      html: buildAdminReturnEmail(emailData),
    }).catch(err => console.error('[EMAIL] Admin return notification failed:', err.message));

    console.log(`[RETURN] ✓ Booking #${req.params.id} saved with status "${finalStatus}"`);
    console.log(`[RETURN] Sending 200 success response`);
    return res.json({ success: true, status: finalStatus, booking: updated.rows[0] });

  } catch (error) {
    console.error('[RETURN] FATAL ERROR:', error.message);
    console.error('[RETURN] Stack:', error.stack);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
});

// ─── EMAIL HELPERS ────────────────────────────────────────────────────────────

function buildPickupReadyEmail(booking, frontendUrl) {
  const apiUrl = process.env.API_URL || 'http://localhost:5001';
  const photoFilename = Array.isArray(booking.car_photos) && booking.car_photos.length > 0
    ? booking.car_photos[0] : null;
  const carPhotoHtml = photoFilename
    ? `<img src="${apiUrl}/uploads/${photoFilename}" alt="${booking.year} ${booking.make} ${booking.model}"
          style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-bottom:16px;display:block" />`
    : `<div style="background:linear-gradient(135deg,#1565C0,#1E88E5);height:120px;border-radius:10px;
          display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:52px">🚗</div>`;

  const cancelUrl = `${frontendUrl}/car-rental/rental/${booking.id}`;

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0D2B6B,#1565C0);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-size:40px;margin-bottom:10px">🚗</div>
        <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px">Your Car is Ready for Pickup!</h1>
        <p style="margin:8px 0 0;opacity:0.85;font-size:14px">Orlando Superhost — Car Rental</p>
      </div>

      <!-- Body -->
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">

        <p style="font-size:16px;margin-top:0">Hi <strong>${booking.customer_full_name || 'Valued Customer'}</strong>,</p>
        <p style="color:#555;line-height:1.6;margin-top:0">
          Great news — the rental agreement is fully signed and your car is ready!
          Please arrive at pickup on the scheduled date and time below.
        </p>

        <!-- Car photo + details -->
        <div style="background:#F8FAFF;border:1px solid #E3F2FD;border-left:5px solid #0D2B6B;border-radius:12px;padding:20px;margin:20px 0">
          ${carPhotoHtml}
          <h2 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#0D2B6B">${booking.year} ${booking.make} ${booking.model}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr>
              <td style="padding:8px 0;color:#888;font-weight:600;width:40%">Booking ID</td>
              <td style="padding:8px 0;font-weight:700;color:#0D2B6B">#${booking.id}</td>
            </tr>
            ${booking.customer_id ? `
            <tr>
              <td style="padding:8px 0;color:#888;font-weight:600">Customer ID</td>
              <td style="padding:8px 0;font-weight:700;color:#0D2B6B;font-family:monospace">${booking.customer_id}</td>
            </tr>` : ''}
            <tr style="background:#F0F7FF">
              <td style="padding:10px 8px;color:#888;font-weight:600">📅 Pickup Date</td>
              <td style="padding:10px 8px;font-weight:800;color:#0D2B6B">${fmtDate(booking.pickup_date)}</td>
            </tr>
            <tr style="background:#F0F7FF">
              <td style="padding:10px 8px;color:#888;font-weight:600">⏰ Pickup Time</td>
              <td style="padding:10px 8px;font-weight:800;color:#0D2B6B">${fmtTime(booking.pickup_time)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-weight:600">📍 Location</td>
              <td style="padding:8px 0;font-weight:600">${booking.city_name || ''}${booking.state_name ? ', ' + booking.state_name : ''}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-weight:600">🏁 Return Date</td>
              <td style="padding:8px 0;font-weight:600">${fmtDate(booking.return_date)} at ${fmtTime(booking.return_time)}</td>
            </tr>
          </table>
        </div>

        <!-- Checklist -->
        <div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:10px;padding:16px 20px;margin-bottom:20px">
          <strong style="color:#2e7d32;display:block;margin-bottom:10px;font-size:14px">✅ What to bring at pickup</strong>
          <ul style="margin:0;padding-left:20px;color:#2e7d32;font-size:13px;line-height:2">
            <li>Valid driver's license</li>
            <li>A copy of this confirmation email</li>
            <li>Your Customer ID: <strong>${booking.customer_id || 'on file'}</strong></li>
          </ul>
        </div>

        <!-- Cancellation policy -->
        <div style="background:#FFF8E1;border-left:4px solid #F57C00;padding:14px 18px;margin-bottom:20px;border-radius:4px">
          <strong style="color:#E65100;display:block;margin-bottom:8px">📋 Cancellation Policy</strong>
          <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.9;color:#5d4037">
            <li>Cancel <strong>more than 24 hours</strong> before pickup — full refund</li>
            <li>Cancel <strong>less than 24 hours</strong> before pickup — no refund</li>
            <li>No show — no refund</li>
          </ul>
        </div>

        <!-- Cancel button -->
        <div style="text-align:center;margin:24px 0 8px">
          <a href="${cancelUrl}"
             style="display:inline-block;background:#F57C00;color:white;padding:14px 32px;border-radius:10px;
                    text-decoration:none;font-weight:800;font-size:15px;letter-spacing:0.3px">
            View Booking Details
          </a>
          <br />
          <a href="${cancelUrl}"
             style="display:inline-block;margin-top:12px;color:#c62828;font-size:13px;text-decoration:underline">
            Cancel this booking
          </a>
        </div>

        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost Car Rental<br/>
          Questions? Reply to this email or visit our website.
        </p>
      </div>
    </div>
  `;
}

function buildAgreementEmailHtml(booking, frontendUrl) {
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#1565C0,#1E88E5);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px">Your Rental Agreement is Ready</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Orlando Superhost — Car Rental</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p style="font-size:16px">Hi <strong>${booking.customer_full_name || 'Valued Customer'}</strong>,</p>
        <p style="color:#555;line-height:1.6">Your rental agreement for the <strong>${booking.year} ${booking.make} ${booking.model}</strong> is attached to this email as a PDF.</p>
        <p style="color:#555;line-height:1.6">Please review and sign it digitally by clicking the button below:</p>
        <a href="${frontendUrl}/car-rental/rental/${booking.id}"
           style="display:inline-block;background:#1565C0;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:12px 0">
          Review &amp; Sign Agreement
        </a>
        <p style="margin-top:16px;color:#555;line-height:1.6">The agreement PDF is also attached to this email for your records.</p>
        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost
        </p>
      </div>
    </div>
  `;
}

function buildReturnSummaryEmail(b, frontendUrl) {
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  const isDamaged = b.condition_at_return === 'Damaged';
  const hasCharges = b.return_type === 'with_charges';

  const chargeRows = [
    b.lateHours > 0 && `
      <tr><td style="padding:10px;color:#555;font-size:13px">Late Fee (${b.lateHours} hr${b.lateHours !== 1 ? 's' : ''} × $25/hr)</td>
      <td style="padding:10px;text-align:right;color:#c62828;font-weight:700">${money(b.calculatedLateFee)}</td></tr>`,
    b.extraMiles > 0 && `
      <tr><td style="padding:10px;color:#555;font-size:13px">Extra Mileage (${b.extraMiles} mi × ${money(b.extra_mileage_fee / b.extraMiles || 0)}/mi)</td>
      <td style="padding:10px;text-align:right;color:#c62828;font-weight:700">${money(b.extra_mileage_fee)}</td></tr>`,
    b.fuelFeeNum > 0 && `
      <tr><td style="padding:10px;color:#555;font-size:13px">Fuel Fee (${b.fuel_level_at_return} returned)</td>
      <td style="padding:10px;text-align:right;color:#c62828;font-weight:700">${money(b.fuelFeeNum)}</td></tr>`,
    isDamaged && b.damageRepairCostNum > 0 && `
      <tr><td style="padding:10px;color:#555;font-size:13px">Damage / Repair Cost</td>
      <td style="padding:10px;text-align:right;color:#c62828;font-weight:700">${money(b.damageRepairCostNum)}</td></tr>`,
  ].filter(Boolean).join('');

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0D2B6B,#1565C0);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:800">${hasCharges ? 'Return Processed — Charges Applied' : 'Return Processed — All Clear!'}</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Orlando Superhost — Car Rental #${b.id}</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p style="font-size:16px">Hi <strong>${b.customer_full_name || 'Valued Customer'}</strong>,</p>
        <p style="color:#555;line-height:1.6">
          Thank you for renting with <strong>Orlando Superhost</strong>! Your <strong>${b.year} ${b.make} ${b.model}</strong> has been returned and inspected.
          ${hasCharges ? 'Please see the charges applied below.' : 'No issues were found — we hope you had a great trip!'}
        </p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Actual Return Date</td>
            <td style="padding:10px;font-weight:600">${fmtDate(b.actual_return_date)} at ${fmtTime(b.actual_return_time)}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Odometer at Return</td>
            <td style="padding:10px">${b.odometer_at_return != null ? `${b.odometer_at_return} miles` : 'N/A'}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Fuel Level at Return</td>
            <td style="padding:10px">${b.fuel_level_at_return || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Vehicle Condition</td>
            <td style="padding:10px;color:${isDamaged ? '#c62828' : '#2e7d32'};font-weight:700">${b.condition_at_return || 'N/A'}</td>
          </tr>
          ${isDamaged && b.damage_description ? `
          <tr style="background:#FFF5F5">
            <td style="padding:10px;font-weight:600;color:#555">Damage Description</td>
            <td style="padding:10px;color:#c62828">${b.damage_description}</td>
          </tr>` : ''}
        </table>

        ${hasCharges ? `
        <div style="background:#FFF5F5;border:1px solid #FFCDD2;border-radius:10px;padding:18px;margin:16px 0">
          <p style="font-weight:700;color:#c62828;margin:0 0 12px;font-size:15px">Charges Applied</p>
          <table style="width:100%;border-collapse:collapse">
            ${chargeRows}
            <tr style="background:#FFEBEE;border-top:2px solid #FFCDD2">
              <td style="padding:10px;font-weight:800;color:#c62828">Total Deductions</td>
              <td style="padding:10px;text-align:right;font-weight:800;color:#c62828;font-size:15px">${money(b.totalDeductions)}</td>
            </tr>
          </table>
        </div>` : ''}

        <div style="background:${b.depositRefund > 0 ? '#F1F8E9' : '#FFF5F5'};border:1px solid ${b.depositRefund > 0 ? '#AED581' : '#FFCDD2'};border-radius:10px;padding:18px;margin:16px 0">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px;color:#555">Security Deposit Held</td>
              <td style="padding:6px;text-align:right;font-weight:600">${money(b.deposit_amount)}</td>
            </tr>
            <tr>
              <td style="padding:6px;color:#555">Total Deductions</td>
              <td style="padding:6px;text-align:right;color:#c62828;font-weight:600">− ${money(b.totalDeductions)}</td>
            </tr>
            <tr style="border-top:2px solid rgba(0,0,0,0.1)">
              <td style="padding:8px;font-weight:800;color:${b.depositRefund > 0 ? '#2e7d32' : '#c62828'}">
                ${b.depositRefund > 0 ? 'Deposit Refund' : 'No Refund'}
              </td>
              <td style="padding:8px;text-align:right;font-weight:800;color:${b.depositRefund > 0 ? '#2e7d32' : '#c62828'};font-size:16px">
                ${money(b.depositRefund)}
              </td>
            </tr>
            ${b.extraChargeAmount > 0 ? `
            <tr style="background:#FFEBEE">
              <td style="padding:8px;font-weight:800;color:#c62828">Extra Charge Owed</td>
              <td style="padding:8px;text-align:right;font-weight:800;color:#c62828;font-size:16px">${money(b.extraChargeAmount)}</td>
            </tr>` : ''}
          </table>
        </div>

        ${b.depositRefund > 0 ? `
        <div style="background:#E8F5E9;border-left:4px solid #4CAF50;padding:14px 16px;border-radius:4px;margin:16px 0">
          <strong style="color:#2e7d32">💰 Deposit Refund</strong>
          <p style="margin:6px 0 0;font-size:13px;color:#555">
            Deposit refund: <strong style="color:#2e7d32">${money(b.depositRefund)}</strong> will be refunded to your original payment method within <strong>48 hours</strong>.
          </p>
        </div>` : ''}

        <p style="color:#555;line-height:1.6;margin-top:16px">Thank you for choosing Orlando Superhost — we hope to see you again soon! 🙏</p>

        <a href="${frontendUrl}/car-rental/rental/${b.id}"
           style="display:inline-block;background:#0D2B6B;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px">
          View Full Booking Details
        </a>

        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${b.id} · Orlando Superhost
        </p>
      </div>
    </div>
  `;
}

function buildExtraChargeEmail(b, frontendUrl) {
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  const isDamaged = b.condition_at_return === 'Damaged';
  const totalMilesDriven = (b.odometer_at_return != null && b.odomAtPickup != null)
    ? Math.max(0, b.odometer_at_return - b.odomAtPickup) : null;
  const allowedMiles = (b.mileageCapPerDay && b.total_days)
    ? parseFloat((b.mileageCapPerDay * b.total_days).toFixed(1)) : null;

  const tdL = `style="padding:10px 14px;color:#555;font-size:13px;border-bottom:1px solid #f0f0f0"`;
  const tdR = (color) => `style="padding:10px 14px;text-align:right;font-weight:700;font-size:13px;border-bottom:1px solid #f0f0f0;color:${color || '#1a1a1a'}"`;

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;color:#1a1a1a">

      <!-- HEADER -->
      <div style="background:#0D2B6B;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Orlando Superhost</div>
        <div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px">Car Rental</div>
      </div>

      <!-- WARNING BANNER -->
      <div style="background:#F57C00;padding:16px 32px;text-align:center">
        <div style="font-size:16px;font-weight:800;color:white;letter-spacing:0.3px">⚠️ Additional Charge Has Been Applied</div>
      </div>

      <!-- BODY -->
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:32px;border-radius:0 0 12px 12px">

        <p style="font-size:15px;margin-top:0">Hi <strong>${b.customer_full_name || 'Valued Customer'}</strong>,</p>
        <p style="color:#555;line-height:1.7;margin-top:0">
          During the return inspection of your rental, the total charges exceeded your security deposit.
          An additional charge of <strong style="color:#c62828">${money(b.extraChargeAmount)}</strong> has been applied to your card on file.
          Please see the full breakdown below.
        </p>

        <!-- SECTION 1: BOOKING SUMMARY -->
        <div style="margin:24px 0 0">
          <div style="font-size:11px;font-weight:800;color:#0D2B6B;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #E3F2FD">
            Booking Summary
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td ${tdL}>Booking ID</td><td ${tdR()}>#${b.id}</td></tr>
            <tr style="background:#FAFAFA"><td ${tdL}>Vehicle</td><td ${tdR()}>${b.year} ${b.make} ${b.model}</td></tr>
            <tr><td ${tdL}>Scheduled Pickup</td><td ${tdR()}>${fmtDate(b.pickup_date)} at ${fmtTime(b.pickup_time)}</td></tr>
            <tr style="background:#FAFAFA"><td ${tdL}>Scheduled Return</td><td ${tdR()}>${fmtDate(b.return_date)} at ${fmtTime(b.return_time)}</td></tr>
            <tr><td ${tdL}>Actual Return</td><td ${tdR('#E65100')}><strong>${fmtDate(b.actual_return_date)} at ${fmtTime(b.actual_return_time)}</strong></td></tr>
          </table>
        </div>

        <!-- SECTION 2: RETURN INSPECTION -->
        <div style="margin:24px 0 0">
          <div style="font-size:11px;font-weight:800;color:#0D2B6B;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #E3F2FD">
            Return Inspection Results
          </div>
          <table style="width:100%;border-collapse:collapse">
            ${b.odomAtPickup != null ? `<tr><td ${tdL}>Odometer at Pickup</td><td ${tdR()}>${b.odomAtPickup.toLocaleString()} miles</td></tr>` : ''}
            ${b.odometer_at_return != null ? `<tr style="background:#FAFAFA"><td ${tdL}>Odometer at Return</td><td ${tdR()}>${Number(b.odometer_at_return).toLocaleString()} miles</td></tr>` : ''}
            ${totalMilesDriven != null ? `<tr><td ${tdL}>Total Miles Driven</td><td ${tdR()}>${totalMilesDriven.toLocaleString()} miles</td></tr>` : ''}
            ${allowedMiles != null ? `<tr style="background:#FAFAFA"><td ${tdL}>Allowed Miles (${b.mileageCapPerDay}/day × ${b.total_days} days)</td><td ${tdR()}>${allowedMiles.toLocaleString()} miles</td></tr>` : ''}
            ${b.extraMiles > 0 ? `<tr><td ${tdL}>Miles Over Limit</td><td ${tdR('#c62828')}><strong>${b.extraMiles} miles</strong></td></tr>` : ''}
            <tr style="background:#FAFAFA"><td ${tdL}>Fuel Level at Return</td><td ${tdR()}>${b.fuel_level_at_return || 'N/A'}</td></tr>
            <tr><td ${tdL}>Vehicle Condition</td><td ${tdR(isDamaged ? '#c62828' : '#2e7d32')}><strong>${b.condition_at_return || 'N/A'}</strong></td></tr>
          </table>
        </div>

        <!-- SECTION 3: CHARGE BREAKDOWN -->
        <div style="margin:24px 0 0">
          <div style="font-size:11px;font-weight:800;color:#0D2B6B;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #E3F2FD">
            Charge Breakdown
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td ${tdL}>Rental Cost <span style="color:#2e7d32;font-size:11px">(already paid ✅)</span></td><td ${tdR('#aaa')}>${money(b.rental_cost)}</td></tr>
            ${b.lateHours > 0 ? `<tr style="background:#FAFAFA"><td ${tdL}>Late Return Fee (${b.lateHours} hr${b.lateHours !== 1 ? 's' : ''} × $25/hr)</td><td ${tdR('#c62828')}>${money(b.calculatedLateFee)}</td></tr>` : ''}
            ${b.extraMiles > 0 ? `<tr><td ${tdL}>Extra Mileage (${b.extraMiles} mi × ${money(b.overageRatePerMile || 0)}/mi)</td><td ${tdR('#c62828')}>${money(b.calculatedExtraMileageFee)}</td></tr>` : ''}
            ${b.fuelFeeNum > 0 ? `<tr style="background:#FAFAFA"><td ${tdL}>Fuel Fee</td><td ${tdR('#c62828')}>${money(b.fuelFeeNum)}</td></tr>` : ''}
            ${b.damageRepairCostNum > 0 ? `<tr><td ${tdL}>Damage / Repair Cost</td><td ${tdR('#c62828')}>${money(b.damageRepairCostNum)}</td></tr>` : ''}
            <tr style="background:#FFF5F5"><td style="padding:10px 14px;font-weight:700;color:#c62828;border-bottom:1px solid #FFCDD2">Total Charges</td><td style="padding:10px 14px;text-align:right;font-weight:800;color:#c62828;border-bottom:1px solid #FFCDD2">${money(b.totalDeductions)}</td></tr>
            <tr><td style="padding:10px 14px;color:#555;border-bottom:1px solid #f0f0f0">Security Deposit Applied</td><td style="padding:10px 14px;text-align:right;font-weight:700;color:#2e7d32;border-bottom:1px solid #f0f0f0">− ${money(b.deposit_amount)}</td></tr>
            <tr style="background:#FFEBEE"><td style="padding:14px;font-weight:800;color:#b71c1c;font-size:15px">Extra Amount Charged to Card</td><td style="padding:14px;text-align:right;font-weight:800;color:#b71c1c;font-size:18px">${money(b.extraChargeAmount)}</td></tr>
          </table>
        </div>

        ${isDamaged && b.damage_description ? `
        <!-- SECTION 4: DAMAGE REPORT -->
        <div style="margin:24px 0 0">
          <div style="font-size:11px;font-weight:800;color:#0D2B6B;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #FFCDD2">
            Damage Report
          </div>
          <div style="background:#FFF5F5;border:1px solid #FFCDD2;border-radius:8px;padding:14px 18px">
            <p style="margin:0;font-size:13px;color:#555;line-height:1.7">${b.damage_description}</p>
            ${safeJsonParse(b.damage_photos).length > 0 ? `<p style="margin:8px 0 0;font-size:12px;color:#888">📎 Damage photos are attached to this email for your records.</p>` : ''}
          </div>
        </div>` : ''}

        <!-- FOOTER NOTE -->
        <div style="margin:28px 0 0;background:#FFF8E1;border-left:4px solid #F57C00;padding:14px 18px;border-radius:4px">
          <p style="margin:0;font-size:13px;color:#5d4037;line-height:1.7">
            If you have questions about this charge, email us at <a href="mailto:orlandosuperhost@gmail.com" style="color:#E65100">orlandosuperhost@gmail.com</a>
            or reply directly to this email. Reference booking <strong>#${b.id}</strong> when contacting us.
            To dispute this charge, reply to this email within 7 days.
          </p>
        </div>

        <div style="text-align:center;margin:28px 0 8px">
          <a href="${frontendUrl}/car-rental/rental/${b.id}"
             style="display:inline-block;background:#0D2B6B;color:white;padding:14px 32px;border-radius:10px;
                    text-decoration:none;font-weight:800;font-size:15px">
            View Booking Details
          </a>
        </div>

        <p style="color:#bbb;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${b.id} · Orlando Superhost Car Rental<br/>
          orlandosuperhost@gmail.com
        </p>
      </div>
    </div>
  `;
}

function buildAdminCancelEmail(booking) {
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:#c62828;color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:800">Booking Cancelled</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Orlando Superhost — Car Rental</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p style="font-size:16px">Hi <strong>${booking.customer_full_name || 'Valued Customer'}</strong>,</p>
        <p style="color:#555;line-height:1.6">
          Your booking <strong>#${booking.id}</strong> for the <strong>${booking.year} ${booking.make} ${booking.model}</strong>
          has been cancelled by Orlando Superhost.
        </p>
        <p style="color:#555;line-height:1.6">
          Please contact us at
          <a href="mailto:orlandosuperhost@gmail.com" style="color:#1565C0">orlandosuperhost@gmail.com</a>
          for more information or to make a new booking.
        </p>
        <div style="background:#FFF8E1;border-left:4px solid #F57C00;padding:14px 16px;border-radius:4px;margin:16px 0">
          <strong style="color:#E65100">Refund Information</strong>
          <p style="margin:6px 0 0;font-size:13px;color:#555">
            If a payment was made, a refund will be processed within 48 hours to your original payment method.
          </p>
        </div>
        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost
        </p>
      </div>
    </div>
  `;
}

function buildAdminCancelSelfCopyEmail(booking) {
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:#c62828;color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:800">Booking Cancelled by Admin</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Car Rental — Orlando Superhost</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p>You cancelled the following car rental booking. A cancellation notice has been sent to the customer.</p>
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
            <td style="padding:10px;font-weight:600;color:#555">Customer Email</td>
            <td style="padding:10px">${booking.customer_email}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Pickup Date</td>
            <td style="padding:10px">${fmtDate(booking.pickup_date)}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Return Date</td>
            <td style="padding:10px">${fmtDate(booking.return_date)}</td>
          </tr>
        </table>
        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost Admin
        </p>
      </div>
    </div>
  `;
}

function buildAdminReturnEmail(b) {
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  const isDamaged = b.condition_at_return === 'Damaged';
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0D2B6B,#1565C0);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:800">Car Returned — Return Processed</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Car Rental #${b.id} · Orlando Superhost</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p>A car has been returned and the return has been processed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Booking #</td>
            <td style="padding:10px;font-weight:700">#${b.id}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Vehicle</td>
            <td style="padding:10px">${b.year} ${b.make} ${b.model}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Customer</td>
            <td style="padding:10px">${b.customer_full_name}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Actual Return</td>
            <td style="padding:10px">${fmtDate(b.actual_return_date)} at ${fmtTime(b.actual_return_time)}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Condition</td>
            <td style="padding:10px;font-weight:700;color:${isDamaged ? '#c62828' : '#2e7d32'}">${b.condition_at_return || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:600;color:#555">Total Deductions</td>
            <td style="padding:10px;font-weight:700;color:#c62828">${money(b.totalDeductions)}</td>
          </tr>
          <tr style="background:#F8F9FA">
            <td style="padding:10px;font-weight:600;color:#555">Deposit Refund</td>
            <td style="padding:10px;font-weight:700;color:#2e7d32">${money(b.depositRefund)}</td>
          </tr>
          ${b.extraChargeAmount > 0 ? `
          <tr style="background:#FFEBEE">
            <td style="padding:10px;font-weight:800;color:#c62828">Extra Charge</td>
            <td style="padding:10px;font-weight:800;color:#c62828">${money(b.extraChargeAmount)}</td>
          </tr>` : ''}
          <tr style="background:#E3F2FD">
            <td style="padding:10px;font-weight:600;color:#555">Final Status</td>
            <td style="padding:10px;font-weight:800;color:#1565C0">${b.status}</td>
          </tr>
        </table>
        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${b.id} · Orlando Superhost Admin
        </p>
      </div>
    </div>
  `;
}

function buildTripStartedEmail(booking, frontendUrl) {
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#2e7d32,#43a047);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-size:40px;margin-bottom:10px">🚗</div>
        <h1 style="margin:0;font-size:22px;font-weight:800">Your Rental Has Started!</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Orlando Superhost — Car Rental</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
        <p style="font-size:16px">Hi <strong>${booking.customer_full_name || 'Valued Customer'}</strong>,</p>
        <p style="color:#555;line-height:1.6">
          Your <strong>${booking.year} ${booking.make} ${booking.model}</strong> has been picked up and your rental is now active.
          Enjoy your trip!
        </p>
        <div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:10px;padding:18px 20px;margin:16px 0">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr>
              <td style="padding:8px 0;color:#555;font-weight:600;width:40%">Booking #</td>
              <td style="padding:8px 0;font-weight:700;color:#2e7d32">#${booking.id}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#555;font-weight:600">Vehicle</td>
              <td style="padding:8px 0;font-weight:700">${booking.year} ${booking.make} ${booking.model}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#555;font-weight:600">Return By</td>
              <td style="padding:8px 0;font-weight:700;color:#c62828">${fmtDate(booking.return_date)} at ${fmtTime(booking.return_time)}</td>
            </tr>
          </table>
        </div>
        <div style="background:#FFF8E1;border-left:4px solid #F57C00;padding:14px 16px;border-radius:4px;margin:16px 0">
          <strong style="color:#E65100">Late Return Fee</strong>
          <p style="margin:6px 0 0;font-size:13px;color:#555">
            Late returns are charged at $25.00 per hour. Please return the vehicle on time.
          </p>
        </div>
        <a href="${frontendUrl}/car-rental/rental/${booking.id}"
           style="display:inline-block;background:#1565C0;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px">
          View Booking Details
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:28px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
          Booking #${booking.id} · Orlando Superhost
        </p>
      </div>
    </div>
  `;
}

module.exports = router;
