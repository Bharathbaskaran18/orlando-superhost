const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    cb(null, `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|gif|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// ─── GET PROFILE ─────────────────────────────────────────────────────────────

router.get('/profile', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, role, customer_id, phone, address, avatar_url,
              to_char(date_of_birth, 'MM/DD/YYYY') AS date_of_birth,
              to_char(created_at, 'Mon YYYY') AS member_since
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE PROFILE ──────────────────────────────────────────────────────────

router.put('/profile', async (req, res) => {
  const { name, phone, address, date_of_birth } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const { rows } = await db.query(
      `UPDATE users
       SET name=$1, phone=$2, address=$3, date_of_birth=$4
       WHERE id=$5
       RETURNING id, name, email, role, customer_id, phone, address, avatar_url,
                 to_char(date_of_birth,'MM/DD/YYYY') AS date_of_birth,
                 to_char(created_at,'Mon YYYY') AS member_since`,
      [name.trim(), phone || null, address || null, date_of_birth || null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UPLOAD PHOTO ────────────────────────────────────────────────────────────

router.post('/profile/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const avatarUrl = `/uploads/${req.file.filename}`;
  try {
    await db.query('UPDATE users SET avatar_url=$1 WHERE id=$2', [avatarUrl, req.user.id]);
    res.json({ avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STATS ───────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [bookings, rentals, leases] = await Promise.all([
      db.query("SELECT COUNT(*) FROM bookings WHERE user_id=$1 AND status='confirmed'", [req.user.id]),
      db.query('SELECT COUNT(*) FROM car_rental_bookings WHERE user_id=$1', [req.user.id]),
      db.query('SELECT COUNT(*) FROM lease_applications WHERE user_id=$1', [req.user.id]),
    ]);
    res.json({
      bookings: parseInt(bookings.rows[0].count),
      rentals:  parseInt(rentals.rows[0].count),
      leases:   parseInt(leases.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PAYMENT CARDS ───────────────────────────────────────────────────────────

router.get('/cards', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM payment_cards WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cards', async (req, res) => {
  const { card_last4, card_brand, card_expiry, cardholder_name } = req.body;
  if (!card_last4 || !card_expiry) return res.status(400).json({ error: 'Card details required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO payment_cards (user_id, card_last4, card_brand, card_expiry, cardholder_name)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, card_last4, card_brand || 'Visa', card_expiry, cardholder_name || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cards/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM payment_cards WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Card not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE ACCOUNT ──────────────────────────────────────────────────────────

router.delete('/account', async (req, res) => {
  try {
    await db.query("UPDATE bookings SET status='cancelled' WHERE user_id=$1", [req.user.id]);
    await db.query("UPDATE car_rental_bookings SET status='cancelled' WHERE user_id=$1", [req.user.id]);
    await db.query('DELETE FROM users WHERE id=$1', [req.user.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
