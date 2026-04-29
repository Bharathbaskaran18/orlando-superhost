const express = require('express');
const db = require('../db');
const router = express.Router();

// Public: get all enabled states
router.get('/states', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, code FROM states WHERE enabled = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: get enabled cities for a state
router.get('/states/:stateId/cities', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name FROM cities WHERE state_id = $1 AND enabled = true ORDER BY name',
      [req.params.stateId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: get city details with state info
router.get('/cities/:cityId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, s.name as state_name, s.code as state_code
       FROM cities c
       JOIN states s ON c.state_id = s.id
       WHERE c.id = $1`,
      [req.params.cityId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'City not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: get attractions for a city
router.get('/cities/:cityId/attractions', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM attractions WHERE city_id = $1 ORDER BY name',
      [req.params.cityId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
