const db = require('../db');
const { sendEmail } = require('../utils/resendEmail');
const { formatDate } = require('../utils/dateHelper');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com';
const fmtDate = formatDate;
const money = (v) => v != null ? `$${Number(v).toFixed(2)}` : 'N/A';
const REMINDER_DAYS_BEFORE = 5;

function buildReminderEmail(b, entry) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif}
.w{max-width:600px;margin:0 auto;padding:24px}
.hd{background:linear-gradient(135deg,#1565C0,#1E88E5);padding:32px;border-radius:12px 12px 0 0;text-align:center;color:white}
.hd h1{margin:0;font-size:22px;font-weight:800}
.bd{background:white;padding:28px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f4f8;font-size:14px}
.row:last-child{border-bottom:none}
.lb{color:#6b6b6b;font-weight:600}.vl{color:#1a1a1a;font-weight:500;text-align:right}
.tot{background:#FFF8E1;border-radius:8px;padding:14px;margin:14px 0;display:flex;justify-content:space-between;font-weight:800;font-size:16px;color:#F57C00}
.ib{background:#F0F7FF;border-left:4px solid #1565C0;border-radius:8px;padding:14px;margin:12px 0;font-size:14px;line-height:1.7}
.ft{text-align:center;padding:14px;color:#6b6b6b;font-size:12px}
</style></head><body><div class="w">
<div class="hd"><h1>⏰ Rent Payment Reminder</h1></div>
<div class="bd">
<p style="font-size:15px">Hi <strong>${b.customer_first_name}</strong>, this is a friendly reminder that your monthly rent payment for <strong>${b.house_name}</strong> is coming up.</p>
<div class="row"><span class="lb">Property</span><span class="vl">${b.house_name}</span></div>
<div class="row"><span class="lb">Booking #</span><span class="vl">#${b.id}</span></div>
<div class="row"><span class="lb">Month</span><span class="vl">Month ${entry.monthNumber} of ${b.total_months}</span></div>
<div class="tot"><span>Amount Due ${fmtDate(entry.dueDate)}</span><span>${money(entry.amount)}</span></div>
<div class="ib">Please arrange payment before the due date. Contact us at <strong>support@orlandosuperhost.com</strong> with any questions about booking <strong>#${b.id}</strong>.</div>
</div>
<div class="ft">Orlando Superhost · Orlando, FL</div>
</div></body></html>`;
}

function buildAdminReminderEmail(b, entry) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#F57C00;padding:20px 28px;border-radius:12px 12px 0 0;color:white">
  <h1 style="margin:0;font-size:18px;font-weight:800">Payment Reminder Sent</h1>
</div>
<div style="background:white;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;border-top:none">
  <p>A payment reminder was sent to <strong>${b.customer_full_name}</strong> for booking #${b.id} — ${b.house_name}.</p>
  <p>Month ${entry.monthNumber} of ${b.total_months} · Due ${fmtDate(entry.dueDate)} · ${money(entry.amount)}</p>
</div>
</div></body></html>`;
}

async function runHousePaymentReminderJob() {
  console.log('[JOB] Running house payment reminder check...');
  try {
    const result = await db.query(
      `SELECT hb.*, h.name as house_name
       FROM house_bookings hb JOIN houses h ON hb.house_id = h.id
       WHERE hb.status = 'active' AND hb.payment_schedule IS NOT NULL`
    );

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let sentCount = 0;

    for (const b of result.rows) {
      const schedule = Array.isArray(b.payment_schedule) ? b.payment_schedule : JSON.parse(b.payment_schedule);
      let changed = false;

      for (const entry of schedule) {
        if (entry.status === 'paid' || entry.reminderSent) continue;
        const dueDate = new Date(entry.dueDate + 'T12:00:00');
        const daysUntilDue = Math.round((dueDate - today) / 86400000);
        if (daysUntilDue !== REMINDER_DAYS_BEFORE) continue;

        entry.reminderSent = true;
        changed = true;
        sentCount++;

        sendEmail({
          to: b.customer_email,
          subject: `Reminder: Rent Payment Due ${fmtDate(entry.dueDate)} — Orlando Superhost`,
          html: buildReminderEmail(b, entry),
        }).catch(err => console.error(`[JOB] Payment reminder email failed for #${b.id}:`, err.message));

        sendEmail({
          to: ADMIN_EMAIL,
          subject: `Payment Reminder Sent — Booking #${b.id}`,
          html: buildAdminReminderEmail(b, entry),
        }).catch(err => console.error(`[JOB] Admin payment reminder email failed for #${b.id}:`, err.message));

        console.log(`[JOB] Payment reminder sent — booking #${b.id}, month ${entry.monthNumber}`);
      }

      if (changed) {
        await db.query(`UPDATE house_bookings SET payment_schedule=$1 WHERE id=$2`, [JSON.stringify(schedule), b.id]);
      }
    }

    console.log(`[JOB] House payment reminder done — ${sentCount} reminder(s) sent`);
  } catch (err) {
    console.error('[JOB] House payment reminder error:', err.message);
  }
}

function startHousePaymentReminderJob() {
  runHousePaymentReminderJob();
  setInterval(runHousePaymentReminderJob, 60 * 60 * 1000);
}

module.exports = { startHousePaymentReminderJob };
