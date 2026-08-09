const db = require('../db');
const { sendEmail } = require('../utils/email');
const { formatDate } = require('../utils/dateHelper');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com';
const fmtDate = formatDate;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';

function buildMoveInEmail(b) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif}
.w{max-width:600px;margin:0 auto;padding:24px}
.hd{background:linear-gradient(135deg,#1565C0,#1E88E5);padding:36px 32px;border-radius:12px 12px 0 0;text-align:center;color:white}
.hd h1{margin:0;font-size:24px;font-weight:800;line-height:1.3}
.hd p{margin:10px 0 0;opacity:0.92;font-size:15px}
.bd{background:white;padding:30px 32px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f4f8;font-size:14px}
.row:last-child{border-bottom:none}
.lb{color:#6b6b6b;font-weight:600}.vl{color:#1a1a1a;font-weight:600;text-align:right;max-width:65%}
.st{font-size:12px;font-weight:800;color:#6b6b6b;text-transform:uppercase;letter-spacing:.6px;margin:20px 0 8px}
.ib{background:#F0F7FF;border-left:4px solid #1565C0;border-radius:8px;padding:16px;margin:12px 0;font-size:14px;line-height:1.8}
.gb{background:#E8F5E9;border-left:4px solid #2E7D32;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.7}
.ft{text-align:center;padding:16px;color:#6b6b6b;font-size:12px}
</style></head><body><div class="w">
<div class="hd">
  <div style="font-size:48px;margin-bottom:10px">🏠</div>
  <h1>You're Moved In Today!<br>Welcome, ${b.customer_first_name}!</h1>
  <p>You're all set — here's everything you need</p>
</div>
<div class="bd">
  <div class="gb">✅ Your lease is now active. Welcome home!</div>

  <div class="st">Property Details</div>
  <div class="row"><span class="lb">Property</span><span class="vl"><strong>${b.house_name}</strong></span></div>
  <div class="row"><span class="lb">Address</span><span class="vl">${b.house_address || '—'}</span></div>
  <div class="row"><span class="lb">Booking #</span><span class="vl">#${b.id}</span></div>

  <div class="st">Your Lease</div>
  <div class="row"><span class="lb">Move In</span><span class="vl">Today, ${fmtDate(b.move_in_date)}</span></div>
  <div class="row"><span class="lb">Move Out</span><span class="vl">${fmtDate(b.move_out_date)}</span></div>
  <div class="row"><span class="lb">Rental Period</span><span class="vl">${b.total_months} month${b.total_months !== 1 ? 's' : ''}</span></div>
  <div class="row"><span class="lb">Monthly Payment</span><span class="vl">${money(b.monthly_rent)}/month</span></div>
  ${b.next_payment_date ? `<div class="row"><span class="lb">Next Payment Due</span><span class="vl">${fmtDate(b.next_payment_date)}</span></div>` : ''}

  <div class="st">Need Help?</div>
  <div class="ib">
    Questions or need assistance?<br>
    📧 <strong><a href="mailto:${ADMIN_EMAIL}" style="color:#1565C0">${ADMIN_EMAIL}</a></strong><br>
    We typically respond within 30 minutes.
  </div>

  <div style="text-align:center;margin:28px 0 16px">
    <div style="font-size:32px;margin-bottom:8px">🌟</div>
    <div style="font-size:18px;font-weight:800;color:#1565C0;margin-bottom:4px">Welcome Home!</div>
    <div style="font-size:14px;color:#666">We hope you enjoy living at ${b.house_name}.</div>
  </div>
</div>
<div class="ft">Orlando Superhost · Orlando, FL · ${ADMIN_EMAIL}</div>
</div></body></html>`;
}

function buildAdminMoveInEmail(b) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:linear-gradient(135deg,#1565C0,#1E88E5);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;color:white">
  <h1 style="margin:0;font-size:20px;font-weight:800">Auto Move-In Processed 🏠</h1>
  <p style="margin:8px 0 0;opacity:0.85;font-size:14px">House Booking #${b.id}</p>
</div>
<div style="background:white;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;border-top:none">
  <p>The system automatically moved in the following tenant.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
    <tr style="background:#F8F9FA"><td style="padding:10px;font-weight:600;color:#555">Booking #</td><td style="padding:10px;font-weight:700">#${b.id}</td></tr>
    <tr><td style="padding:10px;font-weight:600;color:#555">Property</td><td style="padding:10px">${b.house_name}</td></tr>
    <tr style="background:#F8F9FA"><td style="padding:10px;font-weight:600;color:#555">Tenant</td><td style="padding:10px">${b.customer_full_name || b.customer_first_name}</td></tr>
    <tr><td style="padding:10px;font-weight:600;color:#555">Email</td><td style="padding:10px">${b.customer_email}</td></tr>
    <tr style="background:#F8F9FA"><td style="padding:10px;font-weight:600;color:#555">Move-In Date</td><td style="padding:10px">${fmtDate(b.move_in_date)}</td></tr>
    <tr><td style="padding:10px;font-weight:600;color:#555">Move-Out Date</td><td style="padding:10px">${fmtDate(b.move_out_date)}</td></tr>
  </table>
  <p style="color:#aaa;font-size:12px;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
    Booking #${b.id} · Orlando Superhost Auto Move-In
  </p>
</div>
</div></body></html>`;
}

// ── Job logic ─────────────────────────────────────────────────────────────────

async function runHouseMoveInJob() {
  console.log('[JOB] Running house move-in check...');
  try {
    // Find approved leases where move_in_date has arrived
    const result = await db.query(
      `SELECT hb.*, h.name as house_name, h.address as house_address
       FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id
       WHERE hb.status = 'approved'
         AND hb.move_in_date::date <= CURRENT_DATE`
    );

    if (result.rows.length === 0) {
      console.log('[JOB] House move-in: no leases ready');
      return;
    }

    for (const b of result.rows) {
      await db.query(
        `UPDATE house_bookings SET status='active', updated_at=NOW() WHERE id=$1`,
        [b.id]
      );

      sendEmail({
        to: b.customer_email,
        subject: `You're Moved In Today! 🏠 Welcome, ${b.customer_first_name}!`,
        html: buildMoveInEmail(b),
      }).catch(err => console.error(`[JOB] House move-in email failed for #${b.id}:`, err.message));

      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Auto Move-In — Booking #${b.id} — ${b.house_name}`,
        html: buildAdminMoveInEmail(b),
      }).catch(err => console.error(`[JOB] Admin auto-move-in email failed for #${b.id}:`, err.message));

      console.log(`[JOB] House move-in processed — booking #${b.id} (${b.house_name})`);
    }

    console.log(`[JOB] House move-in done — ${result.rows.length} lease(s) activated`);
  } catch (err) {
    console.error('[JOB] House move-in error:', err.message);
  }
}

function startHouseCheckinJob() {
  runHouseMoveInJob();
  setInterval(runHouseMoveInJob, 60 * 60 * 1000);
}

module.exports = { startHouseCheckinJob };
