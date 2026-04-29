const router = require('express').Router();
const pool = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY created_at DESC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Car not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price_per_day, image_url, seats } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO cars (name, description, price_per_day, image_url, seats) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price_per_day, image_url || null, seats || 4]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price_per_day, image_url, seats, available } = req.body;
  try {
    const result = await pool.query(
      'UPDATE cars SET name=$1, description=$2, price_per_day=$3, image_url=$4, seats=$5, available=$6 WHERE id=$7 RETURNING *',
      [name, description, price_per_day, image_url || null, seats, available, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Car not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM cars WHERE id = $1', [req.params.id]);
    res.json({ message: 'Car deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
