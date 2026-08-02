const db = require('../db');
const { sendEmail } = require('../utils/email');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com';

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${ap}`;
};

function buildCheckinEmail(b) {
  const checkinTime  = b.checkin_time  ? fmtTime(b.checkin_time)  : '3:00 PM';
  const checkoutTime = b.checkout_time ? fmtTime(b.checkout_time) : '11:00 AM';
  const rules        = b.house_rules || '';
  const instructions = b.checkin_instructions || 'Please check your confirmation email for access details.';

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
.wb{background:#FFF8E1;border-left:4px solid #F57C00;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.7}
.gb{background:#E8F5E9;border-left:4px solid #2E7D32;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.7}
pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;margin:0;font-size:13px;line-height:1.8}
.ft{text-align:center;padding:16px;color:#6b6b6b;font-size:12px}
.badge{display:inline-block;background:#E3F2FD;color:#1565C0;padding:4px 14px;border-radius:20px;font-weight:700;font-size:13px}
</style></head><body><div class="w">
<div class="hd">
  <div style="font-size:48px;margin-bottom:10px">🏠</div>
  <h1>Your Stay Begins Today!<br>Welcome, ${b.customer_first_name}!</h1>
  <p>You're all set — here's everything you need for your stay</p>
</div>
<div class="bd">
  <div class="gb">✅ Your booking is active and you're officially checked in. Enjoy your stay!</div>

  <div class="st">Property Details</div>
  <div class="row"><span class="lb">Property</span><span class="vl"><strong>${b.house_name}</strong></span></div>
  <div class="row"><span class="lb">Address</span><span class="vl">${b.house_address || '—'}</span></div>
  <div class="row"><span class="lb">Booking #</span><span class="vl">#${b.id}</span></div>

  <div class="st">Your Stay</div>
  <div class="row"><span class="lb">Check-In</span><span class="vl">Today, ${fmtDate(b.checkin_date)} from <strong>${checkinTime}</strong></span></div>
  <div class="row"><span class="lb">Check-Out</span><span class="vl">${fmtDate(b.checkout_date)} by <strong>${checkoutTime}</strong></span></div>
  <div class="row"><span class="lb">Guests</span><span class="vl">${b.num_guests}${b.pets ? ' · 🐾 Pets' : ''}</span></div>

  <div class="st">Access & WiFi Details</div>
  <div class="ib"><pre>${instructions}</pre></div>

  ${rules ? `<div class="st">House Rules</div>
  <div class="wb"><pre>${rules}</pre></div>` : ''}

  <div class="st">Late Checkout Policy</div>
  <div class="wb">
    ⏰ Please check out by <strong>${checkoutTime}</strong>.<br>
    Late checkout is charged at <strong>$${Number(b.late_checkout_fee || 25).toFixed(2)}/hour</strong> beyond the scheduled checkout time.
  </div>

  <div class="st">Emergency Contact</div>
  <div class="ib">
    Need immediate assistance during your stay?<br>
    📧 <strong><a href="mailto:${ADMIN_EMAIL}" style="color:#1565C0">${ADMIN_EMAIL}</a></strong><br>
    We typically respond within 30 minutes.
  </div>

  <div style="text-align:center;margin:28px 0 16px">
    <div style="font-size:32px;margin-bottom:8px">🌟</div>
    <div style="font-size:18px;font-weight:800;color:#1565C0;margin-bottom:4px">Enjoy Your Stay!</div>
    <div style="font-size:14px;color:#666">We hope you have a wonderful time at ${b.house_name}.</div>
  </div>
</div>
<div class="ft">Orlando Superhost · Orlando, FL · ${ADMIN_EMAIL}</div>
</div></body></html>`;
}

function buildAdminCheckinEmail(b) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:linear-gradient(135deg,#1565C0,#1E88E5);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;color:white">
  <h1 style="margin:0;font-size:20px;font-weight:800">Auto Check-In Processed 🏠</h1>
  <p style="margin:8px 0 0;opacity:0.85;font-size:14px">House Booking #${b.id}</p>
</div>
<div style="background:white;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;border-top:none">
  <p>The system automatically checked in the following guest.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
    <tr style="background:#F8F9FA"><td style="padding:10px;font-weight:600;color:#555">Booking #</td><td style="padding:10px;font-weight:700">#${b.id}</td></tr>
    <tr><td style="padding:10px;font-weight:600;color:#555">Property</td><td style="padding:10px">${b.house_name}</td></tr>
    <tr style="background:#F8F9FA"><td style="padding:10px;font-weight:600;color:#555">Guest</td><td style="padding:10px">${b.customer_full_name || b.customer_first_name}</td></tr>
    <tr><td style="padding:10px;font-weight:600;color:#555">Email</td><td style="padding:10px">${b.customer_email}</td></tr>
    <tr style="background:#F8F9FA"><td style="padding:10px;font-weight:600;color:#555">Check-In Date</td><td style="padding:10px">${fmtDate(b.checkin_date)}</td></tr>
    <tr><td style="padding:10px;font-weight:600;color:#555">Check-Out Date</td><td style="padding:10px">${fmtDate(b.checkout_date)}</td></tr>
    <tr style="background:#F8F9FA"><td style="padding:10px;font-weight:600;color:#555">Guests</td><td style="padding:10px">${b.num_guests}${b.pets ? ' · Pets: Yes' : ''}</td></tr>
  </table>
  <p style="color:#aaa;font-size:12px;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
    Booking #${b.id} · Orlando Superhost Auto Check-In
  </p>
</div>
</div></body></html>`;
}

// ── Job logic ─────────────────────────────────────────────────────────────────

async function ensureColumn() {
  await db.query(
    `ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS checkin_email_sent BOOLEAN DEFAULT FALSE`
  );
}

async function runHouseCheckinJob() {
  console.log('[JOB] Running house check-in timer check...');
  try {
    await ensureColumn();

    // Find approved bookings where checkin_date = today and current time >= checkin_time
    const result = await db.query(
      `SELECT hb.*,
              h.name as house_name, h.address as house_address,
              h.checkin_instructions, h.house_rules,
              h.checkin_time, h.checkout_time, h.late_checkout_fee
       FROM house_bookings hb
       JOIN houses h ON hb.house_id = h.id
       WHERE hb.status = 'approved'
         AND hb.checkin_date::date = CURRENT_DATE
         AND (hb.checkin_email_sent = FALSE OR hb.checkin_email_sent IS NULL)
         AND (h.checkin_time IS NULL OR LOCALTIME >= h.checkin_time::time)`
    );

    if (result.rows.length === 0) {
      console.log('[JOB] House check-in: no bookings ready');
      return;
    }

    for (const b of result.rows) {
      await db.query(
        `UPDATE house_bookings
         SET status='checked_in', checkin_email_sent=TRUE, updated_at=NOW()
         WHERE id=$1`,
        [b.id]
      );

      sendEmail({
        to: b.customer_email,
        subject: `Your Stay Begins Today! 🏠 Welcome, ${b.customer_first_name}!`,
        html: buildCheckinEmail(b),
      }).catch(err => console.error(`[JOB] House check-in email failed for #${b.id}:`, err.message));

      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Auto Check-In — Booking #${b.id} — ${b.house_name}`,
        html: buildAdminCheckinEmail(b),
      }).catch(err => console.error(`[JOB] Admin auto-checkin email failed for #${b.id}:`, err.message));

      console.log(`[JOB] House check-in processed — booking #${b.id} (${b.house_name})`);
    }

    console.log(`[JOB] House check-in done — ${result.rows.length} booking(s) checked in`);
  } catch (err) {
    console.error('[JOB] House check-in error:', err.message);
  }
}

function startHouseCheckinJob() {
  runHouseCheckinJob();
  setInterval(runHouseCheckinJob, 60 * 60 * 1000);
}

module.exports = { startHouseCheckinJob };
