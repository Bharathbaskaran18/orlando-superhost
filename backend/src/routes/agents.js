const router = require('express').Router();
const pool = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agents ORDER BY created_at DESC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Agent not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, bio, price_per_hour, image_url, specialty } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO agents (name, bio, price_per_hour, image_url, specialty) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, bio, price_per_hour, image_url || null, specialty]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, bio, price_per_hour, image_url, specialty, available } = req.body;
  try {
    const result = await pool.query(
      'UPDATE agents SET name=$1, bio=$2, price_per_hour=$3, image_url=$4, specialty=$5, available=$6 WHERE id=$7 RETURNING *',
      [name, bio, price_per_hour, image_url || null, specialty, available, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Agent not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM agents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Agent deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
