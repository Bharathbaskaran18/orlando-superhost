const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/resendEmail');
const { formatDate } = require('../utils/dateHelper');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const router = express.Router();

router.use(authenticateToken, requireAdmin);

const fmtDate = formatDate;
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
      `SELECT hb.*, h.name as house_name, h.address as house_address, h.photos as house_photos,
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
      `SELECT hb.*, h.name as house_name, h.address as house_address
       FROM house_bookings hb JOIN houses h ON hb.house_id = h.id WHERE hb.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (b.status !== 'pending_approval')
      return res.status(400).json({ error: 'Only pending leases can be approved' });

    await db.query(`UPDATE house_bookings SET status='approved', updated_at=NOW() WHERE id=$1`, [req.params.id]);

    console.log('[EMAIL TRIGGER] Sending email to:', b.customer_email);
    sendEmail({ to: b.customer_email, subject: 'Your Lease is Confirmed! ✅ Orlando Superhost', html: buildApprovalEmail(b) })
      .catch(e => console.error('[EMAIL] hb-approve:', e.message));
    console.log('[EMAIL TRIGGER] Sending email to:', (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'));
    sendEmail({ to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'), subject: `House Lease #${b.id} Approved`, html: buildAdminActionEmail('Approved', b) })
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
    if (['completed', 'cancelled'].includes(b.status))
      return res.status(400).json({ error: 'Cannot cancel this booking' });

    const moveInMs = new Date(b.move_in_date).getTime();
    const hoursUntilMoveIn = (moveInMs - Date.now()) / 3600000;
    const eligibleForRefund = hoursUntilMoveIn >= 24;

    let refunded = false;
    if (eligibleForRefund && b.stripe_payment_intent_id && stripe) {
      try {
        await stripe.refunds.create({ payment_intent: b.stripe_payment_intent_id });
        refunded = true;
      } catch (refundErr) {
        console.error('[STRIPE] Admin house cancel refund error:', refundErr.message);
      }
    }

    await db.query(`UPDATE house_bookings SET status='cancelled', updated_at=NOW() WHERE id=$1`, [req.params.id]);

    console.log('[EMAIL TRIGGER] Sending email to:', b.customer_email);
    sendEmail({ to: b.customer_email, subject: 'House Lease Cancelled — Orlando Superhost', html: buildCancelEmail(b, cancellationReason, cancellationNotes, eligibleForRefund, refunded) })
      .catch(e => console.error('[EMAIL] hb-cancel:', e.message));
    console.log('[EMAIL TRIGGER] Sending email to:', (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'));
    sendEmail({ to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'), subject: `[Admin Cancelled] House Lease #${b.id} — ${b.customer_full_name}`, html: buildAdminActionEmail('Cancelled', b) })
      .catch(e => console.error('[EMAIL] hb-admin-cancel:', e.message));

    res.json({ message: 'Cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MOVE IN ───────────────────────────────────────────────────────────────────

router.put('/house-bookings/:id/move-in', async (req, res) => {
  try {
    const bRes = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address
       FROM house_bookings hb JOIN houses h ON hb.house_id = h.id WHERE hb.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (b.status !== 'approved')
      return res.status(400).json({ error: 'Lease must be approved before move-in' });

    await db.query(`UPDATE house_bookings SET status='active', updated_at=NOW() WHERE id=$1`, [req.params.id]);

    console.log('[EMAIL TRIGGER] Sending email to:', b.customer_email);
    sendEmail({ to: b.customer_email, subject: 'Welcome Home! You Are Moved In 🏠 — Orlando Superhost', html: buildMoveInEmail(b) })
      .catch(e => console.error('[EMAIL] hb-movein:', e.message));
    console.log('[EMAIL TRIGGER] Sending email to:', (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'));
    sendEmail({ to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'), subject: `Tenant Moved In — Booking #${b.id}`, html: buildAdminActionEmail('Moved In', b) })
      .catch(e => console.error('[EMAIL] hb-admin-movein:', e.message));

    res.json({ message: 'Moved in' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RECORD MONTHLY PAYMENT ────────────────────────────────────────────────────

router.post('/house-bookings/:id/record-payment', async (req, res) => {
  const { monthNumber } = req.body || {};
  if (!monthNumber) return res.status(400).json({ error: 'monthNumber is required' });
  try {
    const bRes = await db.query('SELECT * FROM house_bookings WHERE id = $1', [req.params.id]);
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];

    const schedule = Array.isArray(b.payment_schedule) ? b.payment_schedule : (b.payment_schedule ? JSON.parse(b.payment_schedule) : []);
    const entry = schedule.find(m => m.monthNumber === parseInt(monthNumber));
    if (!entry) return res.status(404).json({ error: 'Payment month not found in schedule' });
    if (entry.status === 'paid') return res.status(400).json({ error: 'This month is already marked paid' });

    entry.status = 'paid';
    entry.paidAt = new Date().toISOString();

    const unpaid = schedule.filter(m => m.status !== 'paid');
    const nextPaymentDate = unpaid.length > 0 ? unpaid.sort((a, b2) => a.dueDate.localeCompare(b2.dueDate))[0].dueDate : null;

    const updated = await db.query(
      `UPDATE house_bookings SET payment_schedule=$1, next_payment_date=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [JSON.stringify(schedule), nextPaymentDate, req.params.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MOVE OUT / DEPOSIT SETTLEMENT ─────────────────────────────────────────────

router.post('/house-bookings/:id/move-out', async (req, res) => {
  const { actualMoveOutDate, depositRefundStatus, depositRefundAmount, depositRefundNotes } = req.body || {};
  if (!['full', 'partial', 'withheld'].includes(depositRefundStatus))
    return res.status(400).json({ error: 'depositRefundStatus must be full, partial, or withheld' });

  try {
    const bRes = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address
       FROM house_bookings hb JOIN houses h ON hb.house_id = h.id WHERE hb.id = $1`,
      [req.params.id]
    );
    if (!bRes.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const b = bRes.rows[0];
    if (!['active', 'approved'].includes(b.status))
      return res.status(400).json({ error: 'Cannot process move-out for this booking' });

    const deposit = parseFloat(b.deposit_amount) || 0;
    let refundAmount = depositRefundStatus === 'full' ? deposit
      : depositRefundStatus === 'partial' ? Math.max(0, Math.min(deposit, parseFloat(depositRefundAmount) || 0))
      : 0;
    refundAmount = Math.round(refundAmount * 100) / 100;

    let stripeNote = null;
    if (refundAmount > 0 && b.stripe_payment_intent_id && stripe) {
      try {
        await stripe.refunds.create({ payment_intent: b.stripe_payment_intent_id, amount: Math.round(refundAmount * 100) });
      } catch (refundErr) {
        console.error('[STRIPE] House move-out refund error:', refundErr.message);
        stripeNote = `Deposit refund of $${refundAmount.toFixed(2)} could not be processed automatically: ${refundErr.message}. Process manually.`;
      }
    }

    const updated = await db.query(
      `UPDATE house_bookings SET
         status='completed', move_out_date=COALESCE($1, move_out_date), moved_out_at=NOW(),
         deposit_refund_status=$2, deposit_refund_amount=$3,
         deposit_refund_notes=$4, next_payment_date=NULL, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [actualMoveOutDate || null, depositRefundStatus, refundAmount,
       [depositRefundNotes, stripeNote].filter(Boolean).join('\n') || null, req.params.id]
    );
    const b2 = updated.rows[0];

    console.log('[EMAIL TRIGGER] Sending email to:', b.customer_email);
    sendEmail({ to: b.customer_email, subject: 'Move-Out Complete — Orlando Superhost', html: buildMoveOutEmail(b2) })
      .catch(e => console.error('[EMAIL] hb-moveout:', e.message));
    console.log('[EMAIL TRIGGER] Sending email to:', (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'));
    sendEmail({ to: (process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com'), subject: `Tenant Moved Out — Booking #${b.id}`, html: buildAdminActionEmail('Moved Out', b2) })
      .catch(e => console.error('[EMAIL] hb-admin-moveout:', e.message));

    res.json(b2);
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
.wh{background:#FFEBEE;border-radius:8px;padding:14px;margin:8px 0;display:flex;justify-content:space-between;font-weight:800;font-size:15px;color:#C62828}
.st{font-size:12px;font-weight:800;color:#6b6b6b;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 6px}
.ib{background:#F0F7FF;border-left:4px solid #1565C0;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.7}
.wb{background:#FFF8E1;border-left:4px solid #F57C00;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.6}
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
  return `<table class="sched"><tr><th>Month</th><th>Due Date</th><th style="text-align:right">Amount</th><th>Status</th></tr>
    ${rows.map(m => `<tr><td>Month ${m.monthNumber}</td><td>${fmtDate(m.dueDate)}</td><td style="text-align:right">${money(m.amount)}</td><td>${m.status === 'paid' ? '✅ Paid' : 'Due'}</td></tr>`).join('')}
  </table>`;
}

function buildApprovalEmail(b) {
  return layout('🏠 Your Lease is Confirmed!', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>! Your lease at <strong>${b.house_name}</strong> is confirmed.</p>
<div class="st">Lease Details</div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Address</span><span class="vl">${b.house_address}</span></div>
<div class="row"><span class="lb">Move In</span><span class="vl">${fmtDate(b.move_in_date)}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="row"><span class="lb">Rental Period</span><span class="vl">${b.total_months} month${b.total_months !== 1 ? 's' : ''}</span></div>
<div class="row"><span class="lb">Monthly Payment</span><span class="vl">${money(b.monthly_rent)}/month</span></div>
${b.next_payment_date ? `<div class="row"><span class="lb">Next Payment Due</span><span class="vl">${fmtDate(b.next_payment_date)}</span></div>` : ''}
${scheduleTable(b.payment_schedule)}
<div class="wb">🔔 <strong>Cancellation Policy</strong><br>Cancel 24+ hours before move-in = Full refund<br>Cancel less than 24 hours = No refund</div>`);
}

function buildCancelEmail(b, reason, notes, eligibleForRefund, refunded) {
  const deposit = parseFloat(b.deposit_amount) || 0;
  const total   = parseFloat(b.total_amount)   || 0;

  return layout('House Lease Cancelled 🏠', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your lease at <strong>${b.house_name}</strong> has been cancelled.</p>
<div class="st">Lease Details</div>
<div class="row"><span class="lb">Booking #</span><span class="vl">${b.id}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
${b.house_address ? `<div class="row"><span class="lb">Address</span><span class="vl">${b.house_address}</span></div>` : ''}
<div class="row"><span class="lb">Move In</span><span class="vl">${fmtDate(b.move_in_date)}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="row"><span class="lb">Amount Paid</span><span class="vl">${money(total)}</span></div>
${reason ? `
<div class="st">Cancellation Reason</div>
<div class="ib" style="background:#FFF3E0;border-left-color:#F57C00">
  <strong>${reason}</strong>${notes ? `<br><br>${notes}` : ''}
</div>` : ''}
<div class="st">Refund Information</div>
${eligibleForRefund ? `
<div class="ref"><span>✅ Deposit Refund</span><span>${money(deposit)}</span></div>
<div class="ref"><span>✅ First Month Rent Refund</span><span>${money(b.monthly_rent)}</span></div>
<div class="ib" style="background:#E8F5E9;border-left-color:#2E7D32">
  ✅ You are eligible for a <strong>full refund</strong> of ${money(total)}.<br>
  ${refunded ? `Your refund has been processed and will appear within <strong>3–5 business days</strong>.` : `Your refund will be processed within <strong>3–5 business days</strong> to your original payment method.`}
</div>` : `
<div class="wb">
  ❌ <strong>No refund applicable</strong> — this lease was cancelled less than 24 hours before move-in.<br>
  Per our cancellation policy, leases cancelled within 24 hours of move-in are non-refundable.
</div>`}
<div class="ib">Questions or disputes? Email us at <strong>support@orlandosuperhost.com</strong> with your booking number <strong>#${b.id}</strong>.</div>`);
}

function buildMoveInEmail(b) {
  return layout('Welcome Home! You Are Moved In 🏠', `
<p>Hi <strong>${b.customer_first_name}</strong>, you are now officially moved in at <strong>${b.house_name}</strong>!</p>
<div class="row"><span class="lb">Address</span><span class="vl">${b.house_address}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="row"><span class="lb">Monthly Payment</span><span class="vl">${money(b.monthly_rent)}/month</span></div>
${b.next_payment_date ? `<div class="row"><span class="lb">Next Payment Due</span><span class="vl">${fmtDate(b.next_payment_date)}</span></div>` : ''}
<div class="ib">🏡 Welcome home! Contact us immediately if you have any issues.</div>`);
}

function buildMoveOutEmail(b) {
  const deposit = parseFloat(b.deposit_amount) || 0;
  const refund  = parseFloat(b.deposit_refund_amount) || 0;
  const withheld = Math.max(0, deposit - refund);

  return layout('Move-Out Complete 🏠', `
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, your move-out from <strong>${b.house_name}</strong> is complete. Thank you for choosing us!</p>
<div class="st">Lease Summary</div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Move In</span><span class="vl">${fmtDate(b.move_in_date)}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="row"><span class="lb">Rental Period</span><span class="vl">${b.total_months} month${b.total_months !== 1 ? 's' : ''}</span></div>
<div class="st">Deposit Settlement</div>
<div class="row"><span class="lb">Deposit Paid</span><span class="vl">${money(deposit)}</span></div>
${withheld > 0 ? `<div class="row"><span class="lb">Amount Withheld</span><span class="vl">${money(withheld)}</span></div>` : ''}
${refund > 0 ? `<div class="ref"><span>✅ Deposit Refund</span><span>${money(refund)}</span></div>` : `<div class="wh"><span>❌ Deposit Withheld</span><span>${money(deposit)}</span></div>`}
${b.deposit_refund_notes ? `<div class="st">Notes</div><div class="ib"><pre>${b.deposit_refund_notes}</pre></div>` : ''}
<div class="ib">${refund > 0 ? `✅ Your deposit refund of <strong>${money(refund)}</strong> will be processed within <strong>3–5 business days</strong>.` : ''}</div>
<div class="ib">🙏 We hope you enjoyed your stay! Questions? Contact <strong>support@orlandosuperhost.com</strong> with booking <strong>#${b.id}</strong>.</div>`);
}

function buildAdminActionEmail(action, b) {
  return layout(`House Lease ${action}`, `
<p>Booking <strong>#${b.id}</strong> — ${action}</p>
<div class="row"><span class="lb">Guest</span><span class="vl">${b.customer_full_name}</span></div>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Move In</span><span class="vl">${fmtDate(b.move_in_date)}</span></div>
<div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
<div class="tot"><span>Total</span><span>${money(b.total_amount)}</span></div>`);
}

module.exports = router;
