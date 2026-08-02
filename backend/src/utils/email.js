const nodemailer = require('nodemailer');

// ── Config check at module load ───────────────────────────────────────────────

const REQUIRED = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missing  = REQUIRED.filter(k => !process.env[k] || process.env[k].includes('your-'));

if (missing.length > 0) {
  console.warn('[EMAIL] ⚠  SMTP not configured — emails will be SKIPPED.');
  console.warn('[EMAIL]    Unconfigured keys:', missing.join(', '));
  if (missing.includes('SMTP_PASS')) {
    console.warn('[EMAIL]    FIX: Generate a Gmail App Password at https://myaccount.google.com/apppasswords');
    console.warn('[EMAIL]    Then set SMTP_PASS=<16-char-app-password> in backend/.env and restart the server.');
  }
} else {
  console.log(`[EMAIL] ✓  SMTP configured — ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} as ${process.env.SMTP_USER}`);
}

// ── Transporter factory ───────────────────────────────────────────────────────

function getTransporter() {
  if (missing.length > 0) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.SMTP_FROM || 'Orlando Superhost <noreply@orlandosuperhost.com>';

// ── sendEmail ─────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, attachments }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[EMAIL] SKIPPED (not configured) — "${subject}" → ${to}`);
    console.warn('[EMAIL]    Set SMTP_PASS in backend/.env (Gmail App Password) and restart the server.');
    return { skipped: true };
  }

  // Guard: skip and log clearly if recipient is missing
  const recipient = typeof to === 'string' ? to.trim() : to;
  if (!recipient) {
    console.error(`[EMAIL] SKIPPED — no recipient address provided for "${subject}"`);
    console.error('[EMAIL]    The "to" field was:', JSON.stringify(to));
    return { skipped: true };
  }

  try {
    console.log(`[EMAIL] Attempting: "${subject}" → ${recipient}`);
    const result = await transporter.sendMail({ from: FROM, to: recipient, subject, html, attachments });
    console.log(`[EMAIL] ✓ Sent successfully — messageId: ${result.messageId}`);
    return result;
  } catch (err) {
    console.error(`[EMAIL] ✗ FAILED to send "${subject}" → ${to}`);
    console.error(`[EMAIL]   Error: ${err.message}`);
    if (err.message.includes('535') || err.message.includes('Username and Password')) {
      console.error('[EMAIL]   ↳ Authentication failed. Check SMTP_USER and SMTP_PASS in backend/.env');
      console.error('[EMAIL]     SMTP_PASS must be a Gmail App Password, not your regular password.');
      console.error('[EMAIL]     Generate one at: https://myaccount.google.com/apppasswords');
    }
    throw err;
  }
}

// ── verifySmtpConnection (called on server startup) ──────────────────────────

async function verifySmtpConnection() {
  const transporter = getTransporter();

  if (!transporter) {
    console.log('[EMAIL] Startup check skipped — SMTP not configured.');
    return false;
  }

  try {
    await transporter.verify();
    console.log('[EMAIL] ✓ SMTP connection verified successfully.');
    return true;
  } catch (err) {
    console.error('[EMAIL] ✗ SMTP connection FAILED:', err.message);
    console.error('[EMAIL]   Common causes:');
    console.error('[EMAIL]   • Wrong SMTP_PASS — use a Gmail App Password, not your regular password');
    console.error('[EMAIL]   • 2-Step Verification not enabled on the Google account');
    console.error('[EMAIL]   • "Less secure apps" blocked — App Password is the correct fix');
    console.error('[EMAIL]   Generate an App Password at: https://myaccount.google.com/apppasswords');
    return false;
  }
}

module.exports = { sendEmail, verifySmtpConnection };
