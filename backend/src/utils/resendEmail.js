const { Resend } = require('resend');
const fs = require('fs');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = 'Orlando Superhost <noreply@orlandosuperhost.com>';

const sendEmail = async ({ to, subject, html, attachments }) => {
  if (!resend) {
    console.log('[RESEND] Not configured - skipping email to:', to);
    return { skipped: true };
  }
  try {
    const payload = { from: FROM, to, subject, html };

    // Resend expects attachment content as a Buffer/base64 string, not a file path
    // (the old nodemailer-based attachments used { filename, path }).
    if (Array.isArray(attachments) && attachments.length > 0) {
      payload.attachments = attachments
        .map(a => {
          const content = a.content || (a.path ? fs.readFileSync(a.path) : null);
          return content ? { filename: a.filename, content } : null;
        })
        .filter(Boolean);
    }

    const { data, error } = await resend.emails.send(payload);
    if (error) throw new Error(error.message || 'Resend API error');

    console.log('[RESEND] Email sent to:', to, 'ID:', data.id);
    return { ...data, messageId: data.id };
  } catch (error) {
    console.error('[RESEND] Failed to send email to:', to, error.message);
    throw error;
  }
};

// Kept for backward compatibility with routes that previously verified the
// SMTP connection on demand (e.g. the admin "test email" endpoint).
const verifySmtpConnection = async () => {
  const configured = !!resend;
  console.log('[RESEND] configured:', configured);
  return configured;
};

module.exports = { sendEmail, verifySmtpConnection };
