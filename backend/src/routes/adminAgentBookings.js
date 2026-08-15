const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/resendEmail');
const { formatDate, formatTime } = require('../utils/dateHelper');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const router = express.Router();

router.use(authenticateToken, requireAdmin);

const fmtDate = formatDate;
const fmtTime = formatTime;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';

// ── LIST ──────────────────────────────────────────────────────────────────────

router.get('/agent-bookings', async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT ab.*, a.name as agent_name, a.photo as agent_photo,
             ci.name as city_name, u.name as user_name, u.email as user_email
      FROM agent_bookings ab
      JOIN agents a ON ab.agent_id = a.id
      JOIN cities ci ON a.city_id = ci.id
      JOIN users u ON ab.user_id = u.id`;
    const params = [];
    if (status) {
      query += ' WHERE ab.status = $1';
      params.push(status);
    }
    query += ' ORDER BY ab.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DETAIL ────────────────────────────────────────────────────────────────────

router.get('/agent-bookings/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ab.*, a.name as agent_name, a.photo as agent_photo, a.specialty as agent_specialty,
              a.meeting_location, a.languages as agent_languages,
              ci.name as city_name, s.name as state_name,
              u.name as user_name, u.email as user_email
       FROM agent_bookings ab
       JOIN agents a ON ab.agent_id = a.id
       JOIN cities ci ON a.city_id = ci.id
       JOIN states s ON ci.state_id = s.id
       JOIN users u ON ab.user_id = u.id
       WHERE ab.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── APPROVE ───────────────────────────────────────────────────────────────────

router.put('/agent-bookings/:id/approve', async (req, res) => {
  try {
    const bRes = await db.query(
      `SELECT ab.*, a.name as agent_name, a.specialty as agent_specialty,
              a.meeting_location
       FROM agent_bookings ab
       JOIN agents a ON ab.agent_id = a.id
       WHERE ab.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (b.status !== 'pending_approval')
      return res.status(400).json({ error: 'Only pending bookings can be approved' });

    await db.query(`UPDATE agent_bookings SET status='approved', updated_at=NOW() WHERE id=$1`, [req.params.id]);

    sendEmail({
      to: b.customer_email,
      subject: 'Your Agent Booking is Confirmed! 🧭 — Orlando Superhost',
      html: buildApprovalEmail(b),
    }).catch(e => console.error('[EMAIL] ag-approve:', e.message));

    sendEmail({
      to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'),
      subject: `Agent Booking #${b.id} Approved`,
      html: buildAdminActionEmail('Approved', b),
    }).catch(e => console.error('[EMAIL] ag-admin-approve:', e.message));

    res.json({ message: 'Approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CANCEL ────────────────────────────────────────────────────────────────────

router.put('/agent-bookings/:id/cancel', async (req, res) => {
  const { cancellationReason } = req.body || {};
  try {
    const bRes = await db.query(
      `SELECT ab.*, a.name as agent_name, a.specialty as agent_specialty
       FROM agent_bookings ab
       JOIN agents a ON ab.agent_id = a.id
       WHERE ab.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (b.status === 'cancelled')
      return res.status(400).json({ error: 'Cannot cancel this booking' });

    await db.query(
      `UPDATE agent_bookings SET status='cancelled', cancellation_reason=$1, updated_at=NOW() WHERE id=$2`,
      [cancellationReason || null, req.params.id]
    );

    sendEmail({
      to: b.customer_email,
      subject: 'Agent Booking Cancelled — Orlando Superhost',
      html: buildCancelEmail(b, cancellationReason),
    }).catch(e => console.error('[EMAIL] ag-cancel:', e.message));

    sendEmail({
      to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'),
      subject: `[Admin Cancelled] Agent Booking #${b.id} — ${b.customer_full_name}`,
      html: buildAdminActionEmail('Cancelled', b),
    }).catch(e => console.error('[EMAIL] ag-admin-cancel:', e.message));

    res.json({ message: 'Cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── COMPLETE ──────────────────────────────────────────────────────────────────

router.put('/agent-bookings/:id/complete', async (req, res) => {
  try {
    const bRes = await db.query(
      `SELECT ab.*, a.name as agent_name, a.specialty as agent_specialty
       FROM agent_bookings ab JOIN agents a ON ab.agent_id = a.id WHERE ab.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (!['approved', 'pending_approval'].includes(b.status))
      return res.status(400).json({ error: 'Only approved bookings can be marked complete' });

    await db.query(`UPDATE agent_bookings SET status='completed', updated_at=NOW() WHERE id=$1`, [req.params.id]);

    sendEmail({
      to: b.customer_email,
      subject: 'Your Agent Session is Complete! 🧭 — Orlando Superhost',
      html: buildCompleteEmail(b),
    }).catch(e => console.error('[EMAIL] ag-complete:', e.message));

    sendEmail({
      to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'),
      subject: `Agent Session Completed — Booking #${b.id} — ${b.customer_full_name}`,
      html: buildAdminActionEmail('Completed', b),
    }).catch(e => console.error('[EMAIL] ag-admin-complete:', e.message));

    res.json({ message: 'Completed' });
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
.wb{background:#FFF8E1;border-left:4px solid #F57C00;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.6}
.ft{text-align:center;padding:14px;color:#6b6b6b;font-size:12px}
</style></head><body><div class="w">
<div class="hd"><h1>${title}</h1></div>
<div class="bd">${body}</div>
<div class="ft">Orlando Superhost · Orlando, FL</div>
</div></body></html>`;
}

function buildApprovalEmail(b) {
  return layout('🧭 Your Agent Booking is Confirmed!', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>! Your booking with <strong>${b.agent_name}</strong> has been approved.</p>
<div class="st">Booking Details</div>
<div class="row"><span class="lb">Booking ID</span><span class="vl">#${b.id}</span></div>
<div class="row"><span class="lb">Agent</span><span class="vl">${b.agent_name}</span></div>
<div class="row"><span class="lb">Specialty</span><span class="vl">${b.agent_specialty}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(b.booking_date)}</span></div>
<div class="row"><span class="lb">Start Time</span><span class="vl">${fmtTime(b.start_time)}</span></div>
<div class="row"><span class="lb">End Time</span><span class="vl">${fmtTime(b.end_time)}</span></div>
${b.meeting_location ? `<div class="row"><span class="lb">Meeting Location</span><span class="vl">${b.meeting_location}</span></div>` : ''}
<div class="tot"><span>Total Charged</span><span>${money(b.total_amount)}</span></div>
<div class="wb">🔔 <strong>Cancellation Policy</strong><br>Please cancel at least 24 hours in advance to avoid charges. Contact us at support@orlandosuperhost.com with your booking number <strong>#${b.id}</strong>.</div>`);
}

function buildCancelEmail(b, reason) {
  return layout('Agent Booking Cancelled 🧭', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your booking with <strong>${b.agent_name}</strong> has been cancelled.</p>
<div class="st">Booking Details</div>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Agent</span><span class="vl">${b.agent_name}</span></div>
<div class="row"><span class="lb">Specialty</span><span class="vl">${b.agent_specialty}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(b.booking_date)}</span></div>
<div class="row"><span class="lb">Time</span><span class="vl">${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span></div>
<div class="row"><span class="lb">Amount Paid</span><span class="vl">${money(b.total_amount)}</span></div>
${reason ? `
<div class="st">Cancellation Reason</div>
<div class="ib" style="background:#FFF3E0;border-left-color:#F57C00"><strong>${reason}</strong></div>` : ''}
<div class="st">Refund Information</div>
<div class="ib" style="background:#E8F5E9;border-left-color:#2E7D32">
  Your refund will be processed within <strong>3–5 business days</strong> to your original payment method.
</div>
<div class="ib">Questions? Email us at <strong>support@orlandosuperhost.com</strong> with booking <strong>#${b.id}</strong>.</div>`);
}

function buildCompleteEmail(b) {
  return layout('🧭 Your Agent Session is Complete!', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>! Your session with <strong>${b.agent_name}</strong> has been marked as complete.</p>
<div class="st">Session Summary</div>
<div class="row"><span class="lb">Booking ID</span><span class="vl">#${b.id}</span></div>
<div class="row"><span class="lb">Agent</span><span class="vl">${b.agent_name}</span></div>
<div class="row"><span class="lb">Specialty</span><span class="vl">${b.agent_specialty}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(b.booking_date)}</span></div>
<div class="row"><span class="lb">Time</span><span class="vl">${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span></div>
<div class="tot"><span>Total Charged</span><span>${money(b.total_amount)}</span></div>
<div class="ib">🙏 Thank you for booking with Orlando Superhost! We hope the session was helpful. Feel free to book again anytime.</div>
<div class="ib">Questions? Email us at <strong>support@orlandosuperhost.com</strong> with booking <strong>#${b.id}</strong>.</div>`);
}

function buildAdminActionEmail(action, b) {
  return layout(`Agent Booking ${action}`, `
<p>Booking <strong>#${b.id}</strong> — ${action}</p>
<div class="row"><span class="lb">Customer</span><span class="vl">${b.customer_full_name}</span></div>
<div class="row"><span class="lb">Agent</span><span class="vl">${b.agent_name}</span></div>
<div class="row"><span class="lb">Date</span><span class="vl">${fmtDate(b.booking_date)}</span></div>
<div class="row"><span class="lb">Time</span><span class="vl">${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span></div>
<div class="tot"><span>Total</span><span>${money(b.total_amount)}</span></div>`);
}

module.exports = router;
