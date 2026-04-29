const router = require('express').Router();
const pool = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM houses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM houses WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'House not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price_per_day, image_url, location, bedrooms } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO houses (name, description, price_per_day, image_url, location, bedrooms) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price_per_day, image_url || null, location, bedrooms || 1]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price_per_day, image_url, location, bedrooms, available } = req.body;
  try {
    const result = await pool.query(
      'UPDATE houses SET name=$1, description=$2, price_per_day=$3, image_url=$4, location=$5, bedrooms=$6, available=$7 WHERE id=$8 RETURNING *',
      [name, description, price_per_day, image_url || null, location, bedrooms, available, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'House not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM houses WHERE id = $1', [req.params.id]);
    res.json({ message: 'House deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
