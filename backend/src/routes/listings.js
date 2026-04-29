const express = require('express');
const db = require('../db');
const router = express.Router();

// ─── CARS ───────────────────────────────────────────────────────────────────

router.get('/cars', async (req, res) => {
  const { cityId, startDate, endDate } = req.query;
  if (!cityId) return res.status(400).json({ error: 'cityId required' });
  try {
    let query, params;
    if (startDate && endDate) {
      query = `
        SELECT c.*, ci.name as city_name, s.name as state_name
        FROM cars c
        JOIN cities ci ON c.city_id = ci.id
        JOIN states s ON ci.state_id = s.id
        WHERE c.city_id = $1 AND c.available = true
        AND c.id NOT IN (
          SELECT item_id FROM bookings
          WHERE booking_type = 'car' AND status = 'confirmed'
          AND NOT (end_date < $2::date OR start_date > $3::date)
        )
        ORDER BY c.price_per_day`;
      params = [cityId, startDate, endDate];
    } else {
      query = `
        SELECT c.*, ci.name as city_name, s.name as state_name
        FROM cars c
        JOIN cities ci ON c.city_id = ci.id
        JOIN states s ON ci.state_id = s.id
        WHERE c.city_id = $1 AND c.available = true
        ORDER BY c.price_per_day`;
      params = [cityId];
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cars/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, ci.name as city_name, s.name as state_name
       FROM cars c JOIN cities ci ON c.city_id = ci.id JOIN states s ON ci.state_id = s.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Car not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cars/:id/blocked-dates', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT start_date, end_date FROM bookings
       WHERE booking_type = 'car' AND item_id = $1 AND status = 'confirmed'`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HOUSES ─────────────────────────────────────────────────────────────────

router.get('/houses', async (req, res) => {
  const { cityId, startDate, endDate } = req.query;
  if (!cityId) return res.status(400).json({ error: 'cityId required' });
  try {
    let query, params;
    if (startDate && endDate) {
      query = `
        SELECT h.*, ci.name as city_name, s.name as state_name
        FROM houses h
        JOIN cities ci ON h.city_id = ci.id
        JOIN states s ON ci.state_id = s.id
        WHERE h.city_id = $1 AND h.available = true
        AND h.id NOT IN (
          SELECT item_id FROM bookings
          WHERE booking_type = 'house' AND status = 'confirmed'
          AND NOT (end_date < $2::date OR start_date > $3::date)
        )
        ORDER BY h.price_per_night`;
      params = [cityId, startDate, endDate];
    } else {
      query = `
        SELECT h.*, ci.name as city_name, s.name as state_name
        FROM houses h
        JOIN cities ci ON h.city_id = ci.id
        JOIN states s ON ci.state_id = s.id
        WHERE h.city_id = $1 AND h.available = true
        ORDER BY h.price_per_night`;
      params = [cityId];
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/houses/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT h.*, ci.name as city_name, s.name as state_name
       FROM houses h JOIN cities ci ON h.city_id = ci.id JOIN states s ON ci.state_id = s.id
       WHERE h.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'House not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/houses/:id/blocked-dates', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT start_date, end_date FROM bookings
       WHERE booking_type = 'house' AND item_id = $1 AND status = 'confirmed'`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AGENTS ─────────────────────────────────────────────────────────────────

router.get('/agents', async (req, res) => {
  const { cityId, date } = req.query;
  if (!cityId) return res.status(400).json({ error: 'cityId required' });
  try {
    let query, params;
    if (date) {
      query = `
        SELECT a.*, ci.name as city_name, s.name as state_name
        FROM agents a
        JOIN cities ci ON a.city_id = ci.id
        JOIN states s ON ci.state_id = s.id
        WHERE a.city_id = $1 AND a.available = true
        AND a.id NOT IN (
          SELECT item_id FROM bookings
          WHERE booking_type = 'agent' AND status = 'confirmed' AND start_date = $2::date
        )
        ORDER BY a.hourly_rate`;
      params = [cityId, date];
    } else {
      query = `
        SELECT a.*, ci.name as city_name, s.name as state_name
        FROM agents a
        JOIN cities ci ON a.city_id = ci.id
        JOIN states s ON ci.state_id = s.id
        WHERE a.city_id = $1 AND a.available = true
        ORDER BY a.hourly_rate`;
      params = [cityId];
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/agents/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, ci.name as city_name, s.name as state_name
       FROM agents a JOIN cities ci ON a.city_id = ci.id JOIN states s ON ci.state_id = s.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/agents/:id/blocked-dates', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT start_date FROM bookings
       WHERE booking_type = 'agent' AND item_id = $1 AND status = 'confirmed'`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
