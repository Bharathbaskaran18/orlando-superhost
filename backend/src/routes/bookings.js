const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Create Stripe payment intent
router.post('/payment-intent', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm booking after successful payment
router.post('/confirm', authenticateToken, async (req, res) => {
  const { bookingType, itemId, startDate, endDate, startTime, totalPrice, paymentIntentId } = req.body;
  if (!bookingType || !itemId || !startDate || !totalPrice) {
    return res.status(400).json({ error: 'Missing required booking details' });
  }
  try {
    const result = await db.query(
      `INSERT INTO bookings (user_id, booking_type, item_id, start_date, end_date, start_time, total_price, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, bookingType, itemId, startDate, endDate || null, startTime || null, totalPrice, paymentIntentId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get logged-in user's bookings
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*,
        CASE
          WHEN b.booking_type = 'car' THEN (SELECT concat(make, ' ', model, ' (', year, ')') FROM cars WHERE id = b.item_id)
          WHEN b.booking_type = 'house' THEN (SELECT name FROM houses WHERE id = b.item_id)
          WHEN b.booking_type = 'agent' THEN (SELECT name FROM agents WHERE id = b.item_id)
        END as item_name,
        CASE
          WHEN b.booking_type = 'car' THEN (SELECT ci.name FROM cars c JOIN cities ci ON c.city_id = ci.id WHERE c.id = b.item_id)
          WHEN b.booking_type = 'house' THEN (SELECT ci.name FROM houses h JOIN cities ci ON h.city_id = ci.id WHERE h.id = b.item_id)
          WHEN b.booking_type = 'agent' THEN (SELECT ci.name FROM agents a JOIN cities ci ON a.city_id = ci.id WHERE a.id = b.item_id)
        END as city_name
       FROM bookings b WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
