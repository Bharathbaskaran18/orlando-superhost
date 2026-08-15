const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
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
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(authenticateToken, requireAdmin);

// ─── LEASE PROPERTIES ────────────────────────────────────────────────────────

router.get('/leasing/properties', async (req, res) => {
  const { cityId } = req.query;
  try {
    let query = `SELECT lp.*, ci.name as city_name, s.name as state_name
                 FROM lease_properties lp
                 JOIN cities ci ON lp.city_id = ci.id
                 JOIN states s ON ci.state_id = s.id`;
    const params = [];
    if (cityId) { query += ' WHERE lp.city_id = $1'; params.push(cityId); }
    query += ' ORDER BY lp.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leasing/properties', upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'leaseAgreementPdf', maxCount: 1 },
]), async (req, res) => {
  const { cityId, title, address, numRooms, numBedrooms, numBathrooms, pricePerMonth } = req.body;
  if (!cityId || !title || !address || !numRooms || !numBedrooms || !numBathrooms || !pricePerMonth) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const photos = req.files?.photos ? req.files.photos.map(f => f.filename) : [];
  const leaseAgreementPdf = req.files?.leaseAgreementPdf?.[0]?.filename || null;
  try {
    const result = await db.query(
      `INSERT INTO lease_properties
        (city_id, title, address, num_rooms, num_bedrooms, num_bathrooms, price_per_month, photos, lease_agreement_pdf)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [cityId, title, address, parseInt(numRooms), parseInt(numBedrooms), parseInt(numBathrooms), parseFloat(pricePerMonth), photos, leaseAgreementPdf]
    );
    await db.query('UPDATE cities SET enabled = true WHERE id = $1', [cityId]);
    await db.query('UPDATE states SET enabled = true WHERE id = (SELECT state_id FROM cities WHERE id = $1)', [cityId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/leasing/properties/:id', upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'leaseAgreementPdf', maxCount: 1 },
]), async (req, res) => {
  const { title, address, numRooms, numBedrooms, numBathrooms, pricePerMonth, available, clearPhotos } = req.body;
  try {
    const existing = await db.query('SELECT * FROM lease_properties WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    const newPhotos = req.files?.photos ? req.files.photos.map(f => f.filename) : [];
    const existingPhotos = clearPhotos === 'true' ? [] : (existing.rows[0].photos || []);
    const photos = [...existingPhotos, ...newPhotos];
    const leaseAgreementPdf = req.files?.leaseAgreementPdf?.[0]?.filename || existing.rows[0].lease_agreement_pdf;
    const result = await db.query(
      `UPDATE lease_properties
       SET title=$1, address=$2, num_rooms=$3, num_bedrooms=$4, num_bathrooms=$5,
           price_per_month=$6, photos=$7, lease_agreement_pdf=$8, available=$9
       WHERE id=$10 RETURNING *`,
      [title, address, parseInt(numRooms), parseInt(numBedrooms), parseInt(numBathrooms),
       parseFloat(pricePerMonth), photos, leaseAgreementPdf, available !== 'false', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/leasing/properties/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM lease_properties WHERE id = $1', [req.params.id]);
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LEASE APPLICATIONS ───────────────────────────────────────────────────────

router.get('/leasing/applications', async (req, res) => {
  const { status } = req.query;
  try {
    let query = `SELECT la.*,
      u.name as user_name, u.email as user_email,
      lp.title as property_title, lp.address as property_address, lp.price_per_month,
      ci.name as city_name, s.name as state_name
     FROM lease_applications la
     JOIN users u ON la.user_id = u.id
     JOIN lease_properties lp ON la.property_id = lp.id
     JOIN cities ci ON lp.city_id = ci.id
     JOIN states s ON ci.state_id = s.id`;
    const params = [];
    if (status) { query += ' WHERE la.status = $1'; params.push(status); }
    query += ' ORDER BY la.updated_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leasing/applications/:id', async (req, res) => {
  try {
    const appResult = await db.query(
      `SELECT la.*,
        u.name as user_name, u.email as user_email,
        lp.title as property_title, lp.address as property_address, lp.price_per_month,
        lp.num_rooms, lp.num_bedrooms, lp.num_bathrooms, lp.lease_agreement_pdf,
        ci.name as city_name, s.name as state_name
       FROM lease_applications la
       JOIN users u ON la.user_id = u.id
       JOIN lease_properties lp ON la.property_id = lp.id
       JOIN cities ci ON lp.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       WHERE la.id = $1`,
      [req.params.id]
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

// Update application status (approve / reject / ask info / etc.)
router.put('/leasing/applications/:id/status', async (req, res) => {
  const { status, adminNote } = req.body;
  const validStatuses = [
    'step1_approved', 'step1_rejected', 'step1_info_requested',
    'step2_approved', 'step2_rejected', 'step2_clarification_requested',
  ];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const result = await db.query(
      `UPDATE lease_applications SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [status, adminNote || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    const app = result.rows[0];

    // Fetch property for email context
    const propRes = await db.query('SELECT * FROM lease_properties WHERE id = $1', [app.property_id]);
    const prop = propRes.rows[0];
    if (prop && app.email) {
      const emailCfg = buildStatusEmail(status, app, prop, adminNote);
      if (emailCfg) {
        sendEmail({ to: app.email, subject: emailCfg.subject, html: emailCfg.html })
          .catch(e => console.error(`[EMAIL] lease-status-${status}:`, e.message));
        sendEmail({
          to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
          subject: `[Admin] ${emailCfg.adminSubject}`,
          html: leasingLayout(`Lease Application — ${status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`, `
<p>Status updated for Application <strong>#${app.id}</strong>.</p>
<div class="row"><span class="lb">Application #</span><span class="vl">${app.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${prop.title}</span></div>
<div class="row"><span class="lb">Applicant</span><span class="vl">${app.full_name}</span></div>
<div class="row"><span class="lb">Email</span><span class="vl">${app.email}</span></div>
<div class="row"><span class="lb">New Status</span><span class="vl"><strong>${status}</strong></span></div>
${adminNote ? `<div class="row"><span class="lb">Admin Note</span><span class="vl">${adminNote}</span></div>` : ''}
<div class="tot"><span>Rent</span><span>${money(prop.price_per_month)}/month</span></div>`),
        }).catch(e => console.error(`[EMAIL] lease-admin-status-${status}:`, e.message));
      }
    }

    res.json(app);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildStatusEmail(status, app, prop, adminNote) {
  const baseRows = `
<div class="row"><span class="lb">Application #</span><span class="vl">${app.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${prop.title}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${prop.address}</span></div>
<div class="row"><span class="lb">Monthly Rent</span><span class="vl">${money(prop.price_per_month)}/month</span></div>`;

  const noteBlock = adminNote
    ? `<div class="st">Message from Us</div><div class="ib" style="background:#FFF3E0;border-left-color:#F57C00">${adminNote}</div>`
    : '';

  if (status === 'step1_approved') {
    return {
      subject: `Step 1 Approved — ${prop.title} (#${app.id})`,
      adminSubject: `Step 1 Approved — Application #${app.id} — ${app.full_name}`,
      html: leasingLayout('✅ Step 1 Approved!', `
<p style="font-size:15px">Hi <strong>${app.full_name}</strong>! Great news — your initial application for <strong>${prop.title}</strong> has been approved!</p>
<div class="st">Application Summary</div>${baseRows}
<div class="gb">🎉 <strong>Congratulations!</strong> Please proceed to Step 2 by submitting your supporting documents (ID, proof of income, rental history, and emergency contact).</div>
${noteBlock}`),
    };
  }
  if (status === 'step1_rejected') {
    return {
      subject: `Application Update — ${prop.title} (#${app.id})`,
      adminSubject: `Step 1 Rejected — Application #${app.id} — ${app.full_name}`,
      html: leasingLayout('Application Update', `
<p style="font-size:15px">Hi <strong>${app.full_name}</strong>, we have reviewed your application for <strong>${prop.title}</strong>.</p>
<div class="st">Application Summary</div>${baseRows}
<div class="rb">❌ Unfortunately, we are unable to proceed with your application at this time.</div>
${noteBlock}
<div class="ib">If you have questions, please contact us at <strong>support@orlandosuperhost.com</strong> with your application number <strong>#${app.id}</strong>.</div>`),
    };
  }
  if (status === 'step1_info_requested') {
    return {
      subject: `Additional Information Required — ${prop.title} (#${app.id})`,
      adminSubject: `Info Requested — Application #${app.id} — ${app.full_name}`,
      html: leasingLayout('📋 Additional Information Required', `
<p style="font-size:15px">Hi <strong>${app.full_name}</strong>, we are reviewing your application for <strong>${prop.title}</strong> and need a little more information.</p>
<div class="st">Application Summary</div>${baseRows}
<div class="wb">⚠️ <strong>Action Required</strong><br>Please provide the requested information as soon as possible to continue your application.</div>
${noteBlock}
<div class="ib">Please reply to this email or contact us at <strong>support@orlandosuperhost.com</strong> with your application number <strong>#${app.id}</strong>.</div>`),
    };
  }
  if (status === 'step2_approved') {
    return {
      subject: `Step 2 Approved — Schedule Your Viewing! — ${prop.title} (#${app.id})`,
      adminSubject: `Step 2 Approved — Application #${app.id} — ${app.full_name}`,
      html: leasingLayout('✅ Step 2 Approved — Schedule Your Visit!', `
<p style="font-size:15px">Hi <strong>${app.full_name}</strong>! Your documents for <strong>${prop.title}</strong> have been verified.</p>
<div class="st">Application Summary</div>${baseRows}
<div class="gb">🎉 <strong>Excellent!</strong> You are now ready to schedule a viewing appointment. Log in to your account and book your preferred date and time.</div>
${noteBlock}
<div class="ib">📋 <strong>What's next?</strong><br>Log in to your account and book a viewing appointment at your preferred date and time.</div>`),
    };
  }
  if (status === 'step2_rejected') {
    return {
      subject: `Application Update — ${prop.title} (#${app.id})`,
      adminSubject: `Step 2 Rejected — Application #${app.id} — ${app.full_name}`,
      html: leasingLayout('Application Update', `
<p style="font-size:15px">Hi <strong>${app.full_name}</strong>, we have reviewed your Step 2 documents for <strong>${prop.title}</strong>.</p>
<div class="st">Application Summary</div>${baseRows}
<div class="rb">❌ Unfortunately, we are unable to proceed with your application at this time based on the documents provided.</div>
${noteBlock}
<div class="ib">If you have questions, please contact us at <strong>support@orlandosuperhost.com</strong> with your application number <strong>#${app.id}</strong>.</div>`),
    };
  }
  if (status === 'step2_clarification_requested') {
    return {
      subject: `Document Clarification Required — ${prop.title} (#${app.id})`,
      adminSubject: `Clarification Requested — Application #${app.id} — ${app.full_name}`,
      html: leasingLayout('📋 Document Clarification Required', `
<p style="font-size:15px">Hi <strong>${app.full_name}</strong>, we need clarification on your documents submitted for <strong>${prop.title}</strong>.</p>
<div class="st">Application Summary</div>${baseRows}
<div class="wb">⚠️ <strong>Action Required</strong><br>Please provide the requested clarification or updated documents as soon as possible.</div>
${noteBlock}
<div class="ib">Please reply to this email or contact us at <strong>support@orlandosuperhost.com</strong> with your application number <strong>#${app.id}</strong>.</div>`),
    };
  }
  return null;
}

// ─── LEASE APPOINTMENTS ───────────────────────────────────────────────────────

router.put('/leasing/appointments/:id', async (req, res) => {
  const { action, confirmedDate, confirmedTime, adminNote } = req.body;
  if (!['confirm', 'reschedule', 'cancel'].includes(action)) {
    return res.status(400).json({ error: 'action must be confirm, reschedule, or cancel' });
  }
  try {
    const apptResult = await db.query(
      'SELECT * FROM lease_appointments WHERE id = $1',
      [req.params.id]
    );
    if (apptResult.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    const appt = apptResult.rows[0];

    // Fetch application + property for emails
    const fullAppt = await db.query(
      `SELECT la.full_name, la.email, la.phone, la.property_id,
              lp.title as property_title, lp.address as property_address, lp.price_per_month
       FROM lease_applications la
       JOIN lease_properties lp ON la.property_id = lp.id
       WHERE la.id = $1`,
      [appt.application_id]
    );
    const apptCtx = fullAppt.rows[0];

    if (action === 'confirm') {
      const cfDate = confirmedDate || appt.requested_date;
      const cfTime = confirmedTime || appt.requested_time;
      await db.query(
        `UPDATE lease_appointments
         SET confirmed_date=$1, confirmed_time=$2, admin_note=$3 WHERE id=$4`,
        [cfDate, cfTime, adminNote || null, req.params.id]
      );
      await db.query(
        `UPDATE lease_applications SET status='appointment_confirmed', admin_note=$1, updated_at=NOW() WHERE id=$2`,
        [adminNote || null, appt.application_id]
      );
      if (apptCtx) {
        sendEmail({
          to: apptCtx.email,
          subject: `Viewing Appointment Confirmed — ${apptCtx.property_title}`,
          html: leasingLayout('📅 Appointment Confirmed!', `
<p style="font-size:15px">Hi <strong>${apptCtx.full_name}</strong>! Your viewing appointment for <strong>${apptCtx.property_title}</strong> is confirmed.</p>
<div class="row"><span class="lb">Property</span><span class="vl">${apptCtx.property_title}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${apptCtx.property_address}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl"><strong>${fmtDate(cfDate)}</strong></span></div>
<div class="row"><span class="lb">Time</span><span class="vl"><strong>${fmtTime(cfTime)}</strong></span></div>
${adminNote ? `<div class="st">Notes</div><div class="ib">${adminNote}</div>` : ''}
<div class="gb">✅ Please arrive on time. If you need to reschedule, contact us at least 24 hours in advance.</div>
<div class="ib">Questions? Email us at <strong>support@orlandosuperhost.com</strong>.</div>`),
        }).catch(e => console.error('[EMAIL] lease-appt-confirm-customer:', e.message));
        sendEmail({
          to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
          subject: `Appointment Confirmed — ${apptCtx.full_name} — ${fmtDate(cfDate)}`,
          html: leasingLayout('Appointment Confirmed', `
<p>Viewing appointment confirmed.</p>
<div class="row"><span class="lb">Applicant</span><span class="vl">${apptCtx.full_name}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${apptCtx.property_title}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(cfDate)}</span></div>
<div class="row"><span class="lb">Time</span><span class="vl">${fmtTime(cfTime)}</span></div>`),
        }).catch(e => console.error('[EMAIL] lease-appt-confirm-admin:', e.message));
      }
    } else if (action === 'reschedule') {
      if (!confirmedDate || !confirmedTime) return res.status(400).json({ error: 'New date and time required for reschedule' });
      await db.query(
        `UPDATE lease_appointments
         SET confirmed_date=$1, confirmed_time=$2, admin_note=$3 WHERE id=$4`,
        [confirmedDate, confirmedTime, adminNote || null, req.params.id]
      );
      await db.query(
        `UPDATE lease_applications SET status='appointment_rescheduled', admin_note=$1, updated_at=NOW() WHERE id=$2`,
        [adminNote || null, appt.application_id]
      );
      if (apptCtx) {
        sendEmail({
          to: apptCtx.email,
          subject: `Viewing Appointment Rescheduled — ${apptCtx.property_title}`,
          html: leasingLayout('📅 Appointment Rescheduled', `
<p style="font-size:15px">Hi <strong>${apptCtx.full_name}</strong>, your viewing appointment for <strong>${apptCtx.property_title}</strong> has been rescheduled.</p>
<div class="row"><span class="lb">Property</span><span class="vl">${apptCtx.property_title}</span></div>
<div class="row"><span class="lb">Requested Date</span><span class="vl">${fmtDate(appt.requested_date)}</span></div>
<div class="row"><span class="lb">New Date</span><span class="vl"><strong>${fmtDate(confirmedDate)}</strong></span></div>
<div class="row"><span class="lb">New Time</span><span class="vl"><strong>${fmtTime(confirmedTime)}</strong></span></div>
${adminNote ? `<div class="st">Reason / Notes</div><div class="wb">${adminNote}</div>` : ''}
<div class="ib">Please confirm your availability. If you have questions, email us at <strong>support@orlandosuperhost.com</strong>.</div>`),
        }).catch(e => console.error('[EMAIL] lease-appt-reschedule-customer:', e.message));
        sendEmail({
          to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
          subject: `Appointment Rescheduled — ${apptCtx.full_name} — ${fmtDate(confirmedDate)}`,
          html: leasingLayout('Appointment Rescheduled', `
<p>You rescheduled a viewing appointment.</p>
<div class="row"><span class="lb">Applicant</span><span class="vl">${apptCtx.full_name}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${apptCtx.property_title}</span></div>
<div class="row"><span class="lb">New Date</span><span class="vl">${fmtDate(confirmedDate)}</span></div>
<div class="row"><span class="lb">New Time</span><span class="vl">${fmtTime(confirmedTime)}</span></div>`),
        }).catch(e => console.error('[EMAIL] lease-appt-reschedule-admin:', e.message));
      }
    } else {
      await db.query(
        `UPDATE lease_appointments SET admin_note=$1 WHERE id=$2`,
        [adminNote || null, req.params.id]
      );
      await db.query(
        `UPDATE lease_applications SET status='appointment_cancelled', admin_note=$1, updated_at=NOW() WHERE id=$2`,
        [adminNote || null, appt.application_id]
      );
      if (apptCtx) {
        sendEmail({
          to: apptCtx.email,
          subject: `Viewing Appointment Cancelled — ${apptCtx.property_title}`,
          html: leasingLayout('📅 Appointment Cancelled', `
<p style="font-size:15px">Hi <strong>${apptCtx.full_name}</strong>, your viewing appointment for <strong>${apptCtx.property_title}</strong> has been cancelled.</p>
<div class="row"><span class="lb">Property</span><span class="vl">${apptCtx.property_title}</span></div>
<div class="row"><span class="lb">Requested Date</span><span class="vl">${fmtDate(appt.requested_date)}</span></div>
${adminNote ? `<div class="st">Reason</div><div class="rb">${adminNote}</div>` : ''}
<div class="ib">Please contact us to reschedule or for more information: <strong>support@orlandosuperhost.com</strong>.</div>`),
        }).catch(e => console.error('[EMAIL] lease-appt-cancel-customer:', e.message));
        sendEmail({
          to: process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com',
          subject: `Appointment Cancelled — ${apptCtx.full_name} — ${apptCtx.property_title}`,
          html: leasingLayout('Appointment Cancelled', `
<p>You cancelled a viewing appointment.</p>
<div class="row"><span class="lb">Applicant</span><span class="vl">${apptCtx.full_name}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${apptCtx.property_title}</span></div>
<div class="row"><span class="lb">Requested Date</span><span class="vl">${fmtDate(appt.requested_date)}</span></div>`),
        }).catch(e => console.error('[EMAIL] lease-appt-cancel-admin:', e.message));
      }
    }

    res.json({ message: 'Appointment updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
