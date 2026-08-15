const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/resendEmail');
const { formatDate, formatTime } = require('../utils/dateHelper');
const router = express.Router();

const fmtDate = formatDate;
const fmtTime = formatTime;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';

function leasingLayout(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif}
.w{max-width:600px;margin:0 auto;padding:24px}
.hd{background:linear-gradient(135deg,#0D2B6B,#1565C0);padding:32px;border-radius:12px 12px 0 0;text-align:center;color:white}
.hd h1{margin:0;font-size:22px;font-weight:800}
.bd{background:white;padding:28px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f4f8;font-size:14px}
.row:last-child{border-bottom:none}
.lb{color:#6b6b6b;font-weight:600}.vl{color:#1a1a1a;font-weight:500;text-align:right}
.tot{background:#E3F2FD;border-radius:8px;padding:14px;margin:14px 0;display:flex;justify-content:space-between;font-weight:800;font-size:16px;color:#0D2B6B}
.st{font-size:12px;font-weight:800;color:#6b6b6b;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 6px}
.ib{background:#F0F7FF;border-left:4px solid #1565C0;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.7}
.wb{background:#FFF8E1;border-left:4px solid #F57C00;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.6}
.gb{background:#E8F5E9;border-left:4px solid #2E7D32;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.6}
.rb{background:#FFEBEE;border-left:4px solid #C62828;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.6}
.ft{text-align:center;padding:14px;color:#6b6b6b;font-size:12px}
</style></head><body><div class="w">
<div class="hd"><h1>${title}</h1></div>
<div class="bd">${body}</div>
<div class="ft">Orlando Superhost · Orlando, FL</div>
</div></body></html>`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Browse available properties in a city
router.get('/properties', async (req, res) => {
  const { cityId } = req.query;
  if (!cityId) return res.status(400).json({ error: 'cityId required' });
  try {
    const result = await db.query(
      `SELECT lp.*, ci.name as city_name, s.name as state_name
       FROM lease_properties lp
       JOIN cities ci ON lp.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE lp.city_id = $1 AND lp.available = true AND ci.enabled = true
       ORDER BY lp.created_at DESC`,
      [cityId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single property
router.get('/properties/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT lp.*, ci.name as city_name, s.name as state_name
       FROM lease_properties lp
       JOIN cities ci ON lp.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE lp.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Step 1 application (auth required)
router.post('/applications', authenticateToken, async (req, res) => {
  const { propertyId, fullName, email, phone, currentAddress, reasonForMoving, monthlyIncome, numOccupants } = req.body;
  if (!propertyId || !fullName || !email || !phone || !currentAddress || !reasonForMoving || !monthlyIncome || !numOccupants) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const existing = await db.query(
      `SELECT id FROM lease_applications
       WHERE user_id = $1 AND property_id = $2
       AND status NOT IN ('step1_rejected', 'appointment_cancelled')`,
      [req.user.id, propertyId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have an active application for this property' });
    }
    const result = await db.query(
      `INSERT INTO lease_applications
        (user_id, property_id, full_name, email, phone, current_address, reason_for_moving, monthly_income, num_occupants)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, propertyId, fullName, email, phone, currentAddress, reasonForMoving, parseFloat(monthlyIncome), parseInt(numOccupants)]
    );
    const app = result.rows[0];

    const propRes = await db.query('SELECT * FROM lease_properties WHERE id = $1', [propertyId]);
    const prop = propRes.rows[0];
    if (prop) {
      sendEmail({
        to: email,
        subject: `Lease Application Received — ${prop.title} (#${app.id})`,
        html: leasingLayout('📋 Application Received!', `
<p style="font-size:15px">Hi <strong>${fullName}</strong>! Your lease application for <strong>${prop.title}</strong> has been received.</p>
<div class="st">Application Details</div>
<div class="row"><span class="lb">Application #</span><span class="vl">${app.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${prop.title}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${prop.address}</span></div>
<div class="row"><span class="lb">Monthly Rent</span><span class="vl">${money(prop.price_per_month)}/month</span></div>
<div class="st">Your Information</div>
<div class="row"><span class="lb">Name</span><span class="vl">${fullName}</span></div>
<div class="row"><span class="lb">Phone</span><span class="vl">${phone}</span></div>
<div class="row"><span class="lb">Monthly Income</span><span class="vl">${money(monthlyIncome)}</span></div>
<div class="row"><span class="lb">Occupants</span><span class="vl">${numOccupants}</span></div>
<div class="ib">📋 <strong>What's next?</strong><br>Our team will review your application within 1–2 business days. If approved, you'll be asked to submit additional documentation (Step 2).</div>`),
      }).catch(e => console.error('[EMAIL] lease-step1-customer:', e.message));

      sendEmail({
        to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
        subject: `New Lease Application #${app.id} — ${fullName} — ${prop.title}`,
        html: leasingLayout('New Lease Application', `
<p>A new lease application has been submitted.</p>
<div class="row"><span class="lb">Application #</span><span class="vl">${app.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${prop.title}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${prop.address}</span></div>
<div class="row"><span class="lb">Applicant</span><span class="vl">${fullName}</span></div>
<div class="row"><span class="lb">Email</span><span class="vl">${email}</span></div>
<div class="row"><span class="lb">Phone</span><span class="vl">${phone}</span></div>
<div class="row"><span class="lb">Monthly Income</span><span class="vl">${money(monthlyIncome)}</span></div>
<div class="row"><span class="lb">Occupants</span><span class="vl">${numOccupants}</span></div>
<div class="tot"><span>Rent</span><span>${money(prop.price_per_month)}/month</span></div>
<div class="ib">Log in to the admin panel to review and approve or reject this application.</div>`),
      }).catch(e => console.error('[EMAIL] lease-step1-admin:', e.message));
    }

    res.status(201).json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's applications (auth required)
router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT la.*,
        lp.title as property_title, lp.address as property_address,
        lp.price_per_month, lp.photos as property_photos,
        ci.name as city_name, s.name as state_name
       FROM lease_applications la
       JOIN lease_properties lp ON la.property_id = lp.id
       JOIN cities ci ON lp.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE la.user_id = $1
       ORDER BY la.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single application detail (auth required)
router.get('/my-applications/:id', authenticateToken, async (req, res) => {
  try {
    const appResult = await db.query(
      `SELECT la.*,
        lp.title as property_title, lp.address as property_address,
        lp.price_per_month, lp.photos as property_photos,
        lp.num_rooms, lp.num_bedrooms, lp.num_bathrooms, lp.lease_agreement_pdf,
        ci.name as city_name, s.name as state_name
       FROM lease_applications la
       JOIN lease_properties lp ON la.property_id = lp.id
       JOIN cities ci ON lp.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE la.id = $1 AND la.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (appResult.rows.length === 0) return res.status(404).json({ error: 'Application not found' });

    const application = appResult.rows[0];

    const step2 = await db.query(
      'SELECT * FROM lease_application_step2 WHERE application_id = $1',
      [req.params.id]
    );
    application.step2 = step2.rows[0] || null;

    const appt = await db.query(
      'SELECT * FROM lease_appointments WHERE application_id = $1',
      [req.params.id]
    );
    application.appointment = appt.rows[0] || null;

    res.json(application);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Step 2 (auth required, multipart)
router.post(
  '/applications/:id/step2',
  authenticateToken,
  upload.fields([
    { name: 'idPhoto', maxCount: 1 },
    { name: 'incomeProof', maxCount: 1 },
    { name: 'rentalHistory', maxCount: 1 },
  ]),
  async (req, res) => {
    const { emergencyContactName, emergencyContactPhone, emergencyContactRelation } = req.body;
    if (!emergencyContactName || !emergencyContactPhone || !emergencyContactRelation) {
      return res.status(400).json({ error: 'Emergency contact details required' });
    }
    try {
      const appResult = await db.query(
        'SELECT * FROM lease_applications WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
      if (appResult.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
      if (appResult.rows[0].status !== 'step1_approved') {
        return res.status(400).json({ error: 'Step 1 must be approved before submitting Step 2' });
      }

      const idPhoto = req.files?.idPhoto?.[0]?.filename || null;
      const incomeProof = req.files?.incomeProof?.[0]?.filename || null;
      const rentalHistory = req.files?.rentalHistory?.[0]?.filename || null;

      await db.query(
        `INSERT INTO lease_application_step2
          (application_id, id_photo, income_proof, rental_history,
           emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (application_id) DO UPDATE SET
          id_photo = COALESCE(EXCLUDED.id_photo, lease_application_step2.id_photo),
          income_proof = COALESCE(EXCLUDED.income_proof, lease_application_step2.income_proof),
          rental_history = COALESCE(EXCLUDED.rental_history, lease_application_step2.rental_history),
          emergency_contact_name = EXCLUDED.emergency_contact_name,
          emergency_contact_phone = EXCLUDED.emergency_contact_phone,
          emergency_contact_relation = EXCLUDED.emergency_contact_relation,
          submitted_at = NOW()`,
        [req.params.id, idPhoto, incomeProof, rentalHistory, emergencyContactName, emergencyContactPhone, emergencyContactRelation]
      );

      const result = await db.query(
        `UPDATE lease_applications SET status='step2_pending', updated_at=NOW() WHERE id=$1 RETURNING *`,
        [req.params.id]
      );
      const app = result.rows[0];

      const propRes = await db.query('SELECT * FROM lease_properties WHERE id = $1', [app.property_id]);
      const prop = propRes.rows[0];
      if (prop) {
        sendEmail({
          to: app.email,
          subject: `Step 2 Documents Received — ${prop.title} (#${app.id})`,
          html: leasingLayout('📋 Step 2 Submitted!', `
<p style="font-size:15px">Hi <strong>${app.full_name}</strong>! Your Step 2 documents for <strong>${prop.title}</strong> have been received.</p>
<div class="row"><span class="lb">Application #</span><span class="vl">${app.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${prop.title}</span></div>
<div class="st">Documents Submitted</div>
<div class="row"><span class="lb">ID Photo</span><span class="vl">${idPhoto ? '✅ Received' : '—'}</span></div>
<div class="row"><span class="lb">Income Proof</span><span class="vl">${incomeProof ? '✅ Received' : '—'}</span></div>
<div class="row"><span class="lb">Rental History</span><span class="vl">${rentalHistory ? '✅ Received' : '—'}</span></div>
<div class="ib">📋 <strong>What's next?</strong><br>Our team will review your documents and reach out within 1–2 business days. If approved, you'll be invited to schedule a viewing appointment.</div>`),
        }).catch(e => console.error('[EMAIL] lease-step2-customer:', e.message));

        sendEmail({
          to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
          subject: `Step 2 Submitted — Application #${app.id} — ${app.full_name}`,
          html: leasingLayout('Lease Application Step 2', `
<p>An applicant has submitted their Step 2 documents.</p>
<div class="row"><span class="lb">Application #</span><span class="vl">${app.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${prop.title}</span></div>
<div class="row"><span class="lb">Applicant</span><span class="vl">${app.full_name}</span></div>
<div class="row"><span class="lb">Email</span><span class="vl">${app.email}</span></div>
<div class="row"><span class="lb">ID Photo</span><span class="vl">${idPhoto ? '✅' : '—'}</span></div>
<div class="row"><span class="lb">Income Proof</span><span class="vl">${incomeProof ? '✅' : '—'}</span></div>
<div class="row"><span class="lb">Rental History</span><span class="vl">${rentalHistory ? '✅' : '—'}</span></div>
<div class="ib">Log in to the admin panel to review and approve or reject Step 2.</div>`),
        }).catch(e => console.error('[EMAIL] lease-step2-admin:', e.message));
      }

      res.json(app);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Book appointment (auth required)
router.post('/applications/:id/appointment', authenticateToken, async (req, res) => {
  const { requestedDate, requestedTime } = req.body;
  if (!requestedDate || !requestedTime) return res.status(400).json({ error: 'Date and time required' });
  try {
    const appResult = await db.query(
      'SELECT * FROM lease_applications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (appResult.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    if (appResult.rows[0].status !== 'step2_approved') {
      return res.status(400).json({ error: 'Step 2 must be approved before booking an appointment' });
    }

    await db.query(
      `INSERT INTO lease_appointments (application_id, requested_date, requested_time)
       VALUES ($1,$2,$3)
       ON CONFLICT (application_id) DO UPDATE SET
        requested_date = EXCLUDED.requested_date,
        requested_time = EXCLUDED.requested_time,
        confirmed_date = NULL,
        confirmed_time = NULL,
        admin_note = NULL,
        created_at = NOW()`,
      [req.params.id, requestedDate, requestedTime]
    );

    const result = await db.query(
      `UPDATE lease_applications SET status='appointment_pending', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    const app = result.rows[0];

    const propRes = await db.query('SELECT * FROM lease_properties WHERE id = $1', [app.property_id]);
    const prop = propRes.rows[0];
    if (prop) {
      sendEmail({
        to: app.email,
        subject: `Viewing Appointment Requested — ${prop.title} (#${app.id})`,
        html: leasingLayout('📅 Appointment Requested!', `
<p style="font-size:15px">Hi <strong>${app.full_name}</strong>! Your viewing appointment request for <strong>${prop.title}</strong> has been received.</p>
<div class="row"><span class="lb">Application #</span><span class="vl">${app.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${prop.title}</span></div>
<div class="row"><span class="lb">Requested Date</span><span class="vl">${fmtDate(requestedDate)}</span></div>
<div class="row"><span class="lb">Requested Time</span><span class="vl">${fmtTime(requestedTime)}</span></div>
<div class="ib">📋 <strong>What's next?</strong><br>Our team will confirm your appointment or suggest an alternative time within 1 business day.</div>`),
      }).catch(e => console.error('[EMAIL] lease-appt-customer:', e.message));

      sendEmail({
        to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
        subject: `Viewing Appointment Requested — Application #${app.id} — ${app.full_name}`,
        html: leasingLayout('New Viewing Appointment Request', `
<p>An applicant has requested a viewing appointment.</p>
<div class="row"><span class="lb">Application #</span><span class="vl">${app.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${prop.title}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${prop.address}</span></div>
<div class="row"><span class="lb">Applicant</span><span class="vl">${app.full_name}</span></div>
<div class="row"><span class="lb">Email</span><span class="vl">${app.email}</span></div>
<div class="row"><span class="lb">Phone</span><span class="vl">${app.phone}</span></div>
<div class="row"><span class="lb">Requested Date</span><span class="vl">${fmtDate(requestedDate)}</span></div>
<div class="row"><span class="lb">Requested Time</span><span class="vl">${fmtTime(requestedTime)}</span></div>
<div class="ib">Log in to the admin panel to confirm or reschedule this appointment.</div>`),
      }).catch(e => console.error('[EMAIL] lease-appt-admin:', e.message));
    }

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
