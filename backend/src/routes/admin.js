const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticateToken, requireAdmin);

// ─── STATS ──────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [bookings, cars, houses, agents, revenue] = await Promise.all([
      db.query("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'"),
      db.query('SELECT COUNT(*) FROM cars WHERE available = true'),
      db.query('SELECT COUNT(*) FROM houses WHERE available = true'),
      db.query('SELECT COUNT(*) FROM agents WHERE available = true'),
      db.query("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = 'confirmed'"),
    ]);
    res.json({
      totalBookings: parseInt(bookings.rows[0].count),
      totalCars: parseInt(cars.rows[0].count),
      totalHouses: parseInt(houses.rows[0].count),
      totalAgents: parseInt(agents.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STATES ─────────────────────────────────────────────────────────────────

router.get('/states', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM states ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/states/:id/toggle', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE states SET enabled = NOT enabled WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'State not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CITIES ─────────────────────────────────────────────────────────────────

router.get('/cities', async (req, res) => {
  const { stateId } = req.query;
  try {
    let query = `SELECT c.*, s.name as state_name, s.code as state_code
                 FROM cities c JOIN states s ON c.state_id = s.id`;
    const params = [];
    if (stateId) { query += ' WHERE c.state_id = $1'; params.push(stateId); }
    query += ' ORDER BY s.name, c.name';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cities', async (req, res) => {
  const { stateId, name } = req.body;
  if (!stateId || !name) return res.status(400).json({ error: 'stateId and name required' });
  try {
    const result = await db.query(
      'INSERT INTO cities (state_id, name) VALUES ($1, $2) RETURNING *',
      [stateId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'City already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/cities/:id/toggle', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE cities SET enabled = NOT enabled WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'City not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cities/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM cities WHERE id = $1', [req.params.id]);
    res.json({ message: 'City deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ATTRACTIONS ─────────────────────────────────────────────────────────────

router.get('/attractions', async (req, res) => {
  const { cityId } = req.query;
  try {
    let query = 'SELECT a.*, c.name as city_name FROM attractions a JOIN cities c ON a.city_id = c.id';
    const params = [];
    if (cityId) { query += ' WHERE a.city_id = $1'; params.push(cityId); }
    query += ' ORDER BY a.name';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/attractions', async (req, res) => {
  const { cityId, name, description } = req.body;
  if (!cityId || !name) return res.status(400).json({ error: 'cityId and name required' });
  try {
    const result = await db.query(
      'INSERT INTO attractions (city_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [cityId, name, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/attractions/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM attractions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Attraction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CARS ───────────────────────────────────────────────────────────────────

router.get('/cars', async (req, res) => {
  const { cityId } = req.query;
  try {
    let query = `SELECT c.*, ci.name as city_name, s.name as state_name
                 FROM cars c JOIN cities ci ON c.city_id = ci.id JOIN states s ON ci.state_id = s.id`;
    const params = [];
    if (cityId) { query += ' WHERE c.city_id = $1'; params.push(cityId); }
    query += ' ORDER BY c.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cars', upload.array('photos', 10), async (req, res) => {
  const { cityId, make, model, year, fuelType, seats, pricePerDay } = req.body;
  if (!cityId || !make || !model || !year || !fuelType || !seats || !pricePerDay) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const photos = req.files ? req.files.map(f => f.filename) : [];
  try {
    const result = await db.query(
      `INSERT INTO cars (city_id, make, model, year, fuel_type, seats, price_per_day, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cityId, make, model, parseInt(year), fuelType, parseInt(seats), parseFloat(pricePerDay), photos]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/cars/:id', upload.array('photos', 10), async (req, res) => {
  const { make, model, year, fuelType, seats, pricePerDay, available, clearPhotos } = req.body;
  try {
    const existing = await db.query('SELECT photos FROM cars WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Car not found' });
    const newPhotos = req.files ? req.files.map(f => f.filename) : [];
    const existingPhotos = clearPhotos === 'true' ? [] : (existing.rows[0].photos || []);
    const photos = [...existingPhotos, ...newPhotos];
    const result = await db.query(
      `UPDATE cars SET make=$1,model=$2,year=$3,fuel_type=$4,seats=$5,price_per_day=$6,photos=$7,available=$8
       WHERE id=$9 RETURNING *`,
      [make, model, parseInt(year), fuelType, parseInt(seats), parseFloat(pricePerDay), photos, available !== 'false', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cars/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM cars WHERE id = $1', [req.params.id]);
    res.json({ message: 'Car deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HOUSES ─────────────────────────────────────────────────────────────────

router.get('/houses', async (req, res) => {
  const { cityId } = req.query;
  try {
    let query = `SELECT h.*, ci.name as city_name, s.name as state_name
                 FROM houses h JOIN cities ci ON h.city_id = ci.id JOIN states s ON ci.state_id = s.id`;
    const params = [];
    if (cityId) { query += ' WHERE h.city_id = $1'; params.push(cityId); }
    query += ' ORDER BY h.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/houses', upload.array('photos', 10), async (req, res) => {
  const { cityId, name, address, rooms, bathrooms, pricePerNight } = req.body;
  if (!cityId || !name || !address || !rooms || !bathrooms || !pricePerNight) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const photos = req.files ? req.files.map(f => f.filename) : [];
  try {
    const result = await db.query(
      `INSERT INTO houses (city_id, name, address, rooms, bathrooms, price_per_night, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [cityId, name, address, parseInt(rooms), parseInt(bathrooms), parseFloat(pricePerNight), photos]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/houses/:id', upload.array('photos', 10), async (req, res) => {
  const { name, address, rooms, bathrooms, pricePerNight, available, clearPhotos } = req.body;
  try {
    const existing = await db.query('SELECT photos FROM houses WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'House not found' });
    const newPhotos = req.files ? req.files.map(f => f.filename) : [];
    const existingPhotos = clearPhotos === 'true' ? [] : (existing.rows[0].photos || []);
    const photos = [...existingPhotos, ...newPhotos];
    const result = await db.query(
      `UPDATE houses SET name=$1,address=$2,rooms=$3,bathrooms=$4,price_per_night=$5,photos=$6,available=$7
       WHERE id=$8 RETURNING *`,
      [name, address, parseInt(rooms), parseInt(bathrooms), parseFloat(pricePerNight), photos, available !== 'false', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/houses/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM houses WHERE id = $1', [req.params.id]);
    res.json({ message: 'House deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AGENTS ─────────────────────────────────────────────────────────────────

router.get('/agents', async (req, res) => {
  const { cityId } = req.query;
  try {
    let query = `SELECT a.*, ci.name as city_name, s.name as state_name
                 FROM agents a JOIN cities ci ON a.city_id = ci.id JOIN states s ON ci.state_id = s.id`;
    const params = [];
    if (cityId) { query += ' WHERE a.city_id = $1'; params.push(cityId); }
    query += ' ORDER BY a.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/agents', upload.single('photo'), async (req, res) => {
  const { cityId, name, specialty, hourlyRate } = req.body;
  if (!cityId || !name || !specialty || !hourlyRate) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const photo = req.file ? req.file.filename : null;
  try {
    const result = await db.query(
      `INSERT INTO agents (city_id, name, specialty, hourly_rate, photo)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [cityId, name, specialty, parseFloat(hourlyRate), photo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/agents/:id', upload.single('photo'), async (req, res) => {
  const { name, specialty, hourlyRate, available } = req.body;
  try {
    const existing = await db.query('SELECT photo FROM agents WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    const photo = req.file ? req.file.filename : existing.rows[0].photo;
    const result = await db.query(
      `UPDATE agents SET name=$1,specialty=$2,hourly_rate=$3,photo=$4,available=$5
       WHERE id=$6 RETURNING *`,
      [name, specialty, parseFloat(hourlyRate), photo, available !== 'false', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/agents/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM agents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

router.get('/bookings', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, u.name as user_name, u.email as user_email,
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
       FROM bookings b JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/bookings/:id/cancel', async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
