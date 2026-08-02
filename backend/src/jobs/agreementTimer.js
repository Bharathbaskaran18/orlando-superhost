const db = require('../db');
const { sendEmail } = require('../utils/email');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'orlandosuperhost@gmail.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Email builders ────────────────────────────────────────────────────────────

function buildAutoCancelCustomerEmail(b) {
  const fmtDate = (v) => {
    if (!v) return 'N/A';
    const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  const bookingUrl = `${FRONTEND_URL}/car-rental/rental/${b.id}`;

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:#b71c1c;color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-size:40px;margin-bottom:8px">⚠️</div>
        <h1 style="margin:0;font-size:22px;font-weight:800">Booking Automatically Cancelled</h1>
        <p style="margin:6px 0 0;opacity:0.9;font-size:14px">Rental Agreement Not Signed</p>
      </div>

      <div style="background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">

        <p style="font-size:15px;line-height:1.6;margin-top:0">
          Hi ${b.customer_full_name || 'there'},
        </p>
        <p style="font-size:15px;line-height:1.6">
          Your booking <strong>#${b.id}</strong> for the <strong>${b.year} ${b.make} ${b.model}</strong> has been
          <strong style="color:#b71c1c">automatically cancelled</strong> because the rental agreement was not signed within 24 hours.
        </p>

        <div style="background:#FFF3E0;border:1px solid #FFCC80;border-radius:10px;padding:16px 20px;margin:20px 0">
          <div style="font-weight:700;color:#E65100;margin-bottom:8px">Cancellation Details</div>
          <div style="font-size:14px;line-height:1.8;color:#5d4037">
            <strong>Booking #:</strong> ${b.id}<br/>
            <strong>Vehicle:</strong> ${b.year} ${b.make} ${b.model}<br/>
            <strong>Pickup Date:</strong> ${fmtDate(b.pickup_date)}<br/>
            <strong>Return Date:</strong> ${fmtDate(b.return_date)}<br/>
            <strong>Reason:</strong> Rental agreement not signed within 24 hours of being sent
          </div>
        </div>

        <div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:10px;padding:16px 20px;margin:20px 0">
          <div style="font-weight:700;color:#2e7d32;margin-bottom:6px">Refund Information</div>
          <p style="font-size:14px;color:#1b5e20;margin:0">
            A full refund of <strong>${money(b.total_amount)}</strong> will be processed to your original payment method within <strong>48 hours</strong>.
          </p>
        </div>

        <p style="font-size:14px;line-height:1.6;color:#444">
          If this was a mistake or you would like to rebook, please contact us immediately at
          <a href="mailto:${ADMIN_EMAIL}" style="color:#1565C0">${ADMIN_EMAIL}</a>.
          We would be happy to assist you with a new booking.
        </p>

        <div style="text-align:center;margin:24px 0">
          <a href="${bookingUrl}" style="background:#1565C0;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
            View Booking Details
          </a>
        </div>

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="font-size:12px;color:#999;text-align:center;margin:0">
          Orlando Superhost — Car Rentals · ${ADMIN_EMAIL}
        </p>
      </div>
    </div>`;
}

function buildAutoCancelAdminEmail(b) {
  const fmtDate = (v) => {
    if (!v) return 'N/A';
    const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  const bookingUrl = `${FRONTEND_URL}/admin/car-rentals/${b.id}`;

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:#0D2B6B;color:white;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:20px;font-weight:800">Auto-Cancelled: Booking #${b.id}</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:13px">Agreement not signed within 24 hours</p>
      </div>

      <div style="background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
        <div style="background:#FFF3E0;border-left:4px solid #F57C00;border-radius:6px;padding:14px 18px;margin-bottom:20px">
          <strong style="color:#E65100">Action Required: Please process a refund of ${money(b.total_amount)}</strong>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
          <tr style="background:#F0F7FF">
            <td style="padding:8px 12px;font-weight:700;color:#0D2B6B;width:40%">Customer</td>
            <td style="padding:8px 12px">${b.customer_full_name || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:700;color:#0D2B6B">Email</td>
            <td style="padding:8px 12px">${b.customer_email || '—'}</td>
          </tr>
          <tr style="background:#F0F7FF">
            <td style="padding:8px 12px;font-weight:700;color:#0D2B6B">Vehicle</td>
            <td style="padding:8px 12px">${b.year} ${b.make} ${b.model}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:700;color:#0D2B6B">Pickup Date</td>
            <td style="padding:8px 12px">${fmtDate(b.pickup_date)}</td>
          </tr>
          <tr style="background:#F0F7FF">
            <td style="padding:8px 12px;font-weight:700;color:#0D2B6B">Return Date</td>
            <td style="padding:8px 12px">${fmtDate(b.return_date)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:700;color:#0D2B6B">Total Paid</td>
            <td style="padding:8px 12px;color:#b71c1c;font-weight:700">${money(b.total_amount)}</td>
          </tr>
          <tr style="background:#F0F7FF">
            <td style="padding:8px 12px;font-weight:700;color:#0D2B6B">Agreement Sent</td>
            <td style="padding:8px 12px">${b.rental_agreement_sent_at ? new Date(b.rental_agreement_sent_at).toLocaleString() : '—'}</td>
          </tr>
        </table>

        <div style="background:#E8F5E9;border:1px solid #A5D6A7;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:#2e7d32">
          ✅ Car dates have been unblocked — those dates are now available for new bookings.
        </div>

        <div style="text-align:center">
          <a href="${bookingUrl}" style="background:#0D2B6B;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
            View Booking in Admin
          </a>
        </div>
      </div>
    </div>`;
}

function buildReminderEmail(b) {
  const fmtDate = (v) => {
    if (!v) return 'N/A';
    const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const money = (v) => `$${Number(v || 0).toFixed(2)}`;
  const signUrl = `${FRONTEND_URL}/car-rental/rental/${b.id}`;

  const sentAt = new Date(b.rental_agreement_sent_at);
  const deadline = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000);
  const hoursLeft = Math.max(0, Math.round((deadline - Date.now()) / 3600000));

  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:#F57C00;color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-size:40px;margin-bottom:8px">⏰</div>
        <h1 style="margin:0;font-size:22px;font-weight:800">Action Required — Sign Your Rental Agreement</h1>
        <p style="margin:8px 0 0;opacity:0.95;font-size:15px;font-weight:700">
          You have approximately ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} left to sign
        </p>
      </div>

      <div style="background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
        <p style="font-size:15px;line-height:1.6;margin-top:0">
          Hi ${b.customer_full_name || 'there'},
        </p>
        <p style="font-size:15px;line-height:1.6">
          Your rental agreement for booking <strong>#${b.id}</strong> — the <strong>${b.year} ${b.make} ${b.model}</strong> —
          has not been signed yet. Your booking will be <strong style="color:#b71c1c">automatically cancelled</strong> if you don't sign within the next
          <strong style="color:#E65100">${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}</strong>.
        </p>

        <div style="background:#FFF3E0;border:2px solid #FFCC80;border-radius:10px;padding:16px 20px;margin:20px 0;text-align:center">
          <div style="font-size:28px;font-weight:800;color:#E65100">${hoursLeft} Hour${hoursLeft !== 1 ? 's' : ''} Remaining</div>
          <div style="font-size:13px;color:#5d4037;margin-top:4px">Sign before your booking is automatically cancelled</div>
        </div>

        <div style="text-align:center;margin:24px 0">
          <a href="${signUrl}" style="background:#F57C00;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:800;font-size:16px;display:inline-block">
            Sign Agreement Now →
          </a>
        </div>

        <div style="background:#F8F9FA;border-radius:10px;padding:16px 20px;font-size:14px;line-height:1.8;color:#444">
          <strong>Booking Details:</strong><br/>
          Booking #${b.id} · ${b.year} ${b.make} ${b.model}<br/>
          Pickup: ${fmtDate(b.pickup_date)}<br/>
          Return: ${fmtDate(b.return_date)}<br/>
          Amount Paid: ${money(b.total_amount)}
        </div>

        <p style="font-size:13px;color:#888;margin-top:20px;line-height:1.6">
          If you no longer wish to proceed with this rental, please contact us at
          <a href="mailto:${ADMIN_EMAIL}" style="color:#1565C0">${ADMIN_EMAIL}</a> before the deadline.
        </p>

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="font-size:12px;color:#999;text-align:center;margin:0">
          Orlando Superhost — Car Rentals · ${ADMIN_EMAIL}
        </p>
      </div>
    </div>`;
}

// ── Job logic ─────────────────────────────────────────────────────────────────

async function runAgreementTimerJob() {
  console.log('[JOB] Running agreement timer check...');
  try {
    // ── 1. Auto-cancel expired unsigned agreements ────────────────────────────
    const expired = await db.query(
      `SELECT crb.*, c.make, c.model, c.year
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       WHERE crb.status = 'agreement_sent'
       AND crb.rental_agreement_sent_at < NOW() - INTERVAL '24 hours'`
    );

    for (const booking of expired.rows) {
      // Cancel in car_rental_bookings
      await db.query(
        `UPDATE car_rental_bookings
         SET status='auto_cancelled', updated_at=NOW()
         WHERE id=$1`,
        [booking.id]
      );
      // Also cancel in the generic bookings table (unblocks the dates)
      if (booking.booking_id) {
        await db.query(
          `UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE id=$1`,
          [booking.booking_id]
        ).catch(() => {});
      }

      console.log(`[JOB] Auto-cancelled booking #${booking.id} (agreement not signed within 24h)`);

      // Email customer
      sendEmail({
        to: booking.customer_email,
        subject: `Booking Cancelled — Agreement Not Signed (#${booking.id})`,
        html: buildAutoCancelCustomerEmail(booking),
      }).catch(err => console.error(`[JOB] Customer cancel email failed for #${booking.id}:`, err.message));

      // Email admin
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Auto-Cancelled Booking #${booking.id} — Agreement Not Signed`,
        html: buildAutoCancelAdminEmail(booking),
      }).catch(err => console.error(`[JOB] Admin cancel email failed for #${booking.id}:`, err.message));
    }

    // ── 2. Send 6-hour reminder (18+ hours elapsed, agreement not signed, reminder not yet sent) ──
    const needReminder = await db.query(
      `SELECT crb.*, c.make, c.model, c.year
       FROM car_rental_bookings crb
       JOIN cars c ON crb.car_id = c.id
       WHERE crb.status = 'agreement_sent'
       AND crb.rental_agreement_sent_at < NOW() - INTERVAL '18 hours'
       AND crb.rental_agreement_sent_at > NOW() - INTERVAL '24 hours'
       AND crb.agreement_reminder_sent_at IS NULL`
    );

    for (const booking of needReminder.rows) {
      sendEmail({
        to: booking.customer_email,
        subject: `⚠️ Action Required — Sign Your Rental Agreement (#${booking.id})`,
        html: buildReminderEmail(booking),
      }).catch(err => console.error(`[JOB] Reminder email failed for #${booking.id}:`, err.message));

      await db.query(
        `UPDATE car_rental_bookings SET agreement_reminder_sent_at=NOW(), updated_at=NOW() WHERE id=$1`,
        [booking.id]
      );
      console.log(`[JOB] Sent 6-hour reminder for booking #${booking.id}`);
    }

    if (expired.rows.length > 0 || needReminder.rows.length > 0) {
      console.log(`[JOB] Done — ${expired.rows.length} auto-cancelled, ${needReminder.rows.length} reminders sent`);
    } else {
      console.log('[JOB] Done — no action needed');
    }
  } catch (err) {
    console.error('[JOB] Agreement timer error:', err.message);
  }
}

function startAgreementTimerJob() {
  // Run once immediately on startup, then every hour
  runAgreementTimerJob();
  setInterval(runAgreementTimerJob, 60 * 60 * 1000);
}

module.exports = { startAgreementTimerJob };
