const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendEmail } = require('../utils/email');
const router = express.Router();

// ─── WELCOME EMAIL TEMPLATE ───────────────────────────────────────────────────

function buildWelcomeEmail(name, customerId) {
  const firstName = name.trim().split(' ')[0];
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6f9;padding:24px">

      <!-- Header -->
      <div style="background:#0D2B6B;padding:32px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-size:28px;font-weight:800;color:white;letter-spacing:-0.5px">🌴 Orlando Superhost</div>
        <div style="height:4px;background:#F57C00;border-radius:2px;margin:16px auto 0;width:80px"></div>
      </div>

      <!-- Body -->
      <div style="background:white;padding:40px 36px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;border-top:none">

        <h2 style="margin:0 0 6px;font-size:26px;color:#0D2B6B">Welcome, ${firstName}! 🎉</h2>
        <p style="margin:0 0 6px;font-size:16px;color:#444">Thank you for joining <strong>Orlando Superhost</strong>.</p>
        <p style="margin:0 0 28px;font-size:15px;color:#666">Your account has been created successfully.</p>

        <!-- Customer ID Badge -->
        <div style="background:#F0F4FF;border:2px solid #0D2B6B;border-radius:10px;padding:16px 24px;text-align:center;margin-bottom:32px;display:inline-block;width:100%;box-sizing:border-box">
          <div style="font-size:12px;font-weight:700;color:#0D2B6B;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Your Customer ID</div>
          <div style="font-size:24px;font-weight:800;color:#F57C00;font-family:monospace;letter-spacing:2px">${customerId}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">Keep this ID for your records</div>
        </div>

        <!-- What You Can Do -->
        <div style="margin-bottom:32px">
          <div style="font-size:15px;font-weight:800;color:#0D2B6B;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px">What You Can Do</div>
          <div style="background:#F8F9FA;border-radius:8px;padding:12px 14px;margin-bottom:8px;font-size:14px">
            <span style="font-size:18px">🚗</span>
            <strong style="color:#0D2B6B;margin-left:8px">Rent Cars</strong>
            <span style="color:#666;margin-left:4px">— Browse premium cars across all 50 states</span>
          </div>
          <div style="background:#F8F9FA;border-radius:8px;padding:12px 14px;margin-bottom:8px;font-size:14px">
            <span style="font-size:18px">🏠</span>
            <strong style="color:#0D2B6B;margin-left:8px">Book Houses</strong>
            <span style="color:#666;margin-left:4px">— Find perfect vacation homes</span>
          </div>
          <div style="background:#F8F9FA;border-radius:8px;padding:12px 14px;margin-bottom:8px;font-size:14px">
            <span style="font-size:18px">🧭</span>
            <strong style="color:#0D2B6B;margin-left:8px">Book Agents</strong>
            <span style="color:#666;margin-left:4px">— Connect with local travel experts</span>
          </div>
          <div style="background:#F8F9FA;border-radius:8px;padding:12px 14px;font-size:14px">
            <span style="font-size:18px">🏡</span>
            <strong style="color:#0D2B6B;margin-left:8px">Lease a Home</strong>
            <span style="color:#666;margin-left:4px">— Find your next long-term home</span>
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align:center;margin-bottom:32px">
          <a href="http://localhost:5173" style="display:inline-block;background:#F57C00;color:#0D2B6B;font-weight:800;font-size:16px;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.3px">Start Planning Your Trip →</a>
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid #f0f0f0;padding-top:20px;text-align:center">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0D2B6B">Orlando Superhost — Your #1 Travel &amp; Rental Platform</p>
          <p style="margin:0 0 12px;font-size:12px;color:#888">Contact: <a href="mailto:orlandosuperhost@gmail.com" style="color:#0D2B6B">orlandosuperhost@gmail.com</a></p>
          <p style="margin:0;font-size:11px;color:#bbb">If you did not create this account, please <a href="mailto:orlandosuperhost@gmail.com" style="color:#F57C00">contact us immediately</a>.</p>
        </div>
      </div>
    </div>
  `;
}

// ─── OTP EMAIL TEMPLATE ───────────────────────────────────────────────────────

function buildOtpEmailHtml(name, otp) {
  const digits = otp.split('');
  const box = (d) => `<span style="display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;font-size:28px;font-weight:800;background:#F0F7FF;border:2px solid #1565C0;border-radius:8px;color:#1565C0;margin:0 4px;font-family:monospace">${d}</span>`;
  return `
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#1565C0,#1E88E5);color:white;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px">Orlando Superhost</h1>
        <p style="margin:6px 0 0;opacity:0.85;font-size:14px">Email Verification</p>
      </div>
      <div style="background:white;border:1px solid #e0e0e0;border-top:none;padding:36px 32px;border-radius:0 0 12px 12px;text-align:center">
        <p style="font-size:17px;margin-bottom:6px">Hi <strong>${name}</strong>,</p>
        <p style="color:#555;font-size:15px;line-height:1.6">Thank you for signing up! Enter this verification code to activate your account.</p>
        <div style="margin:28px auto;padding:20px;background:#F0F7FF;border-radius:12px;border:1px solid #BBDEFB;display:inline-block">
          ${digits.map(box).join('')}
        </div>
        <p style="color:#1565C0;font-size:13px;font-weight:700;margin-top:0">CODE EXPIRES IN 10 MINUTES</p>
        <p style="color:#888;font-size:13px">If you didn't create an Orlando Superhost account, you can safely ignore this email.</p>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f0f0f0">
          <p style="color:#aaa;font-size:12px;margin:0">© Orlando Superhost · Secure Account Verification</p>
        </div>
      </div>
    </div>
  `;
}

// ─── REGISTER ────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, is_verified) VALUES ($1, $2, $3, TRUE) RETURNING id, name, email, role',
      [name, email, hash]
    );
    const user = result.rows[0];

    // Assign customer ID immediately (no OTP step while email is disabled)
    const customerId = `OSH-${String(user.id).padStart(5, '0')}`;
    await db.query('UPDATE users SET customer_id=$1 WHERE id=$2', [customerId, user.id]);

    console.log(`[AUTH] Account created: ${email} (userId=${user.id}, customerId=${customerId})`);

    // Send welcome email (non-blocking)
    sendEmail({
      to: email,
      subject: 'Welcome to Orlando Superhost! 🌴',
      html: buildWelcomeEmail(name, customerId),
    }).catch(err => console.error('[AUTH] Welcome email failed:', err.message));

    // OTP email disabled — will be re-enabled with Amazon SES on AWS deploy
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // await db.query('UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE id=$3', [otp, expiresAt, user.id]);
    // sendEmail({ to: email, subject: 'Verify your Orlando Superhost account', html: buildOtpEmailHtml(name, otp) })
    //   .catch(err => console.error('[AUTH] OTP email failed:', err.message));

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────

router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) return res.status(400).json({ error: 'userId and otp are required' });

  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];

    if (user.is_verified) return res.status(400).json({ error: 'Account already verified' });
    if (!user.otp_code || user.otp_code !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Click resend for a new code.' });
    }

    const customerId = `OSH-${String(user.id).padStart(5, '0')}`;

    const updated = await db.query(
      `UPDATE users
       SET is_verified=TRUE, customer_id=$1, otp_code=NULL, otp_expires_at=NULL
       WHERE id=$2
       RETURNING id, name, email, role, customer_id`,
      [customerId, userId]
    );
    const verified = updated.rows[0];

    const token = jwt.sign(
      { id: verified.id, email: verified.email, role: verified.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: verified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RESEND OTP ───────────────────────────────────────────────────────────────

router.post('/resend-otp', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];

    if (user.is_verified) return res.status(400).json({ error: 'Account already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.query('UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE id=$3', [otp, expiresAt, userId]);

    console.log(`[AUTH] Resend OTP ${otp} to ${user.email} (userId=${userId})`);
    sendEmail({ to: user.email, subject: 'Your new Orlando Superhost verification code', html: buildOtpEmailHtml(user.name, otp) })
      .catch(err => console.error('[AUTH] Resend OTP email failed:', err.message));

    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.', userId: user.id, pendingVerification: true });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, customerId: user.customer_id }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
