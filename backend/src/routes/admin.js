const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail, verifySmtpConnection } = require('../utils/email');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadCar = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).fields([
  { name: 'exterior_photos',   maxCount: 10 },
  { name: 'interior_photos',   maxCount: 10 },
  { name: 'additional_photos', maxCount: 10 },
]);

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

router.post('/cars', uploadCar, async (req, res) => {
  const { cityId, make, model, year, fuelType, seats, pricePerDay,
    licensePlate, vinNumber, mileageCapPerDay, overageRatePerMile,
    additionalDriverFeePerDay, cancellationFee, depositAmount } = req.body;
  if (!cityId || !make || !model || !year || !fuelType || !seats || !pricePerDay) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const toNum = (v) => (v !== '' && v != null ? Math.round(parseFloat(v) * 100) / 100 : null);
  const toInt = (v) => (v !== '' && v != null ? parseInt(v) : null);
  const buildCat = (files, category) => (files || []).map(f => ({ url: f.filename, category }));
  const photosJson = [
    ...buildCat(req.files?.exterior_photos,   'exterior'),
    ...buildCat(req.files?.interior_photos,   'interior'),
    ...buildCat(req.files?.additional_photos, 'additional'),
  ];
  const photosFlat = photosJson.map(p => p.url);
  try {
    const result = await db.query(
      `INSERT INTO cars (city_id, make, model, year, fuel_type, seats, price_per_day, photos, photos_categorized,
         license_plate, vin_number, mileage_cap_per_day, overage_rate_per_mile,
         additional_driver_fee_per_day, cancellation_fee, deposit_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [cityId, make, model, parseInt(year), fuelType, parseInt(seats),
       Math.round(parseFloat(pricePerDay) * 100) / 100, photosFlat, JSON.stringify(photosJson),
       licensePlate || null, vinNumber || null, toInt(mileageCapPerDay),
       toNum(overageRatePerMile), toNum(additionalDriverFeePerDay), toNum(cancellationFee), toNum(depositAmount)]
    );
    await db.query('UPDATE cities SET enabled = true WHERE id = $1', [cityId]);
    await db.query('UPDATE states SET enabled = true WHERE id = (SELECT state_id FROM cities WHERE id = $1)', [cityId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/cars/:id', uploadCar, async (req, res) => {
  const { make, model, year, fuelType, seats, pricePerDay, available,
    licensePlate, vinNumber, mileageCapPerDay, overageRatePerMile,
    additionalDriverFeePerDay, cancellationFee, depositAmount,
    existingPhotosJson } = req.body;
  const toNum = (v) => (v !== '' && v != null ? Math.round(parseFloat(v) * 100) / 100 : null);
  const toInt = (v) => (v !== '' && v != null ? parseInt(v) : null);
  try {
    const existing = await db.query('SELECT id FROM cars WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Car not found' });
    const buildCat = (files, category) => (files || []).map(f => ({ url: f.filename, category }));
    const keptPhotos   = existingPhotosJson ? JSON.parse(existingPhotosJson) : [];
    const newPhotosArr = [
      ...buildCat(req.files?.exterior_photos,   'exterior'),
      ...buildCat(req.files?.interior_photos,   'interior'),
      ...buildCat(req.files?.additional_photos, 'additional'),
    ];
    const photosJson = [...keptPhotos, ...newPhotosArr];
    const photosFlat = photosJson.map(p => p.url);
    const result = await db.query(
      `UPDATE cars SET make=$1,model=$2,year=$3,fuel_type=$4,seats=$5,price_per_day=$6,
         photos=$7,photos_categorized=$8,available=$9,
         license_plate=$10,vin_number=$11,mileage_cap_per_day=$12,overage_rate_per_mile=$13,
         additional_driver_fee_per_day=$14,cancellation_fee=$15,deposit_amount=$16
       WHERE id=$17 RETURNING *`,
      [make, model, parseInt(year), fuelType, parseInt(seats),
       Math.round(parseFloat(pricePerDay) * 100) / 100,
       photosFlat, JSON.stringify(photosJson), available !== 'false',
       licensePlate || null, vinNumber || null, toInt(mileageCapPerDay),
       toNum(overageRatePerMile), toNum(additionalDriverFeePerDay), toNum(cancellationFee), toNum(depositAmount),
       req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cars/:id', async (req, res) => {
  try {
    const active = await db.query(
      `SELECT id FROM car_rental_bookings
       WHERE car_id = $1 AND status NOT IN ('cancelled','auto_cancelled','completed','completed_with_charges','completed_extra_charged')
       LIMIT 1`,
      [req.params.id]
    );
    if (active.rows.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete this car. It has active bookings. Please complete or cancel all bookings first before deleting.'
      });
    }
    await db.query('DELETE FROM car_rental_bookings WHERE car_id = $1', [req.params.id]);
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
    let query = `SELECT h.*, ci.name as city_name, s.name as state_name, s.id as state_id
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
  const { cityId, name, address, rooms, bedrooms, bathrooms, pricePerMonth,
    depositAmount, minRentalMonths, maxRentalMonths, gracePeriodDays, latePaymentFee } = req.body;
  if (!cityId || !name || !address || !rooms || !bathrooms || !pricePerMonth) {
    return res.status(400).json({ error: 'Required: cityId, name, address, rooms, bathrooms, pricePerMonth' });
  }
  const photos = req.files ? req.files.map(f => f.filename) : [];
  const toNum = (v) => (v !== '' && v != null ? Math.round(parseFloat(v) * 100) / 100 : null);
  const toInt = (v) => (v !== '' && v != null ? parseInt(v) : null);
  try {
    const result = await db.query(
      `INSERT INTO houses (city_id, name, address, rooms, bedrooms, bathrooms, price_per_month, photos,
         deposit_amount, min_rental_months, max_rental_months, grace_period_days, late_payment_fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [cityId, name, address, parseInt(rooms), toInt(bedrooms) || 1, parseInt(bathrooms),
       Math.round(parseFloat(pricePerMonth) * 100) / 100, photos,
       toNum(depositAmount) || 0, toInt(minRentalMonths) || 1, toInt(maxRentalMonths) || 12,
       toInt(gracePeriodDays) ?? 5, toNum(latePaymentFee) || 0]
    );
    await db.query('UPDATE cities SET enabled = true WHERE id = $1', [cityId]);
    await db.query('UPDATE states SET enabled = true WHERE id = (SELECT state_id FROM cities WHERE id = $1)', [cityId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/houses/:id', upload.array('photos', 10), async (req, res) => {
  const { name, address, rooms, bedrooms, bathrooms, pricePerMonth, available, clearPhotos,
    depositAmount, minRentalMonths, maxRentalMonths, gracePeriodDays, latePaymentFee } = req.body;
  const toNum = (v) => (v !== '' && v != null ? Math.round(parseFloat(v) * 100) / 100 : null);
  const toInt = (v) => (v !== '' && v != null ? parseInt(v) : null);
  try {
    const existing = await db.query('SELECT photos FROM houses WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'House not found' });
    const newPhotos = req.files ? req.files.map(f => f.filename) : [];
    const existingPhotos = clearPhotos === 'true' ? [] : (existing.rows[0].photos || []);
    const photos = [...existingPhotos, ...newPhotos];
    const result = await db.query(
      `UPDATE houses SET name=$1, address=$2, rooms=$3, bedrooms=$4, bathrooms=$5,
         price_per_month=$6, photos=$7, available=$8,
         deposit_amount=$9, min_rental_months=$10, max_rental_months=$11,
         grace_period_days=$12, late_payment_fee=$13
       WHERE id=$14 RETURNING *`,
      [name, address, parseInt(rooms), toInt(bedrooms) || 1, parseInt(bathrooms),
       Math.round(parseFloat(pricePerMonth) * 100) / 100, photos, available !== 'false',
       toNum(depositAmount) || 0, toInt(minRentalMonths) || 1, toInt(maxRentalMonths) || 12,
       toInt(gracePeriodDays) ?? 5, toNum(latePaymentFee) || 0,
       req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/houses/:id', async (req, res) => {
  try {
    const active = await db.query(
      `SELECT id FROM house_bookings
       WHERE house_id = $1 AND status NOT IN ('cancelled','completed')
       LIMIT 1`,
      [req.params.id]
    );
    if (active.rows.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete this house. It has active bookings. Please complete or cancel all bookings first before deleting.'
      });
    }
    await db.query('DELETE FROM house_bookings WHERE house_id = $1', [req.params.id]);
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
  const { cityId, name, specialty, hourlyRate, languages,
    depositAmount, minHours, maxHours, availableDays, meetingLocation, bio } = req.body;
  if (!cityId || !name || !specialty || !hourlyRate) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const photo = req.file ? req.file.filename : null;
  const langs = languages ? JSON.parse(languages) : [];
  const days = availableDays ? JSON.parse(availableDays) : null;
  const toNum = (v) => (v !== '' && v != null ? Math.round(parseFloat(v) * 100) / 100 : null);
  const toInt = (v) => (v !== '' && v != null ? parseInt(v) : null);
  try {
    const result = await db.query(
      `INSERT INTO agents (city_id, name, specialty, hourly_rate, photo, languages,
         deposit_amount, min_hours, max_hours, available_days, meeting_location, bio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [cityId, name, specialty, toNum(hourlyRate), photo, langs,
       toNum(depositAmount) || 0, toInt(minHours) || 2, toInt(maxHours) || 8,
       days, meetingLocation || null, bio || null]
    );
    await db.query('UPDATE cities SET enabled = true WHERE id = $1', [cityId]);
    await db.query('UPDATE states SET enabled = true WHERE id = (SELECT state_id FROM cities WHERE id = $1)', [cityId]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/agents/:id', upload.single('photo'), async (req, res) => {
  const { name, specialty, hourlyRate, available, languages,
    depositAmount, minHours, maxHours, availableDays, meetingLocation, bio } = req.body;
  try {
    const existing = await db.query('SELECT photo FROM agents WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    const photo = req.file ? req.file.filename : existing.rows[0].photo;
    const langs = languages ? JSON.parse(languages) : [];
    const days = availableDays ? JSON.parse(availableDays) : null;
    const toNum = (v) => (v !== '' && v != null ? Math.round(parseFloat(v) * 100) / 100 : null);
    const toInt = (v) => (v !== '' && v != null ? parseInt(v) : null);
    const result = await db.query(
      `UPDATE agents SET name=$1,specialty=$2,hourly_rate=$3,photo=$4,available=$5,languages=$6,
         deposit_amount=$7,min_hours=$8,max_hours=$9,available_days=$10,meeting_location=$11,bio=$12
       WHERE id=$13 RETURNING *`,
      [name, specialty, toNum(hourlyRate), photo, available !== 'false', langs,
       toNum(depositAmount) || 0, toInt(minHours) || 2, toInt(maxHours) || 8,
       days, meetingLocation || null, bio || null,
       req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/agents/:id', async (req, res) => {
  try {
    const active = await db.query(
      `SELECT id FROM agent_bookings
       WHERE agent_id = $1 AND status NOT IN ('cancelled','completed')
       LIMIT 1`,
      [req.params.id]
    );
    if (active.rows.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete this agent. It has active bookings. Please complete or cancel all bookings first before deleting.'
      });
    }
    await db.query('DELETE FROM agent_bookings WHERE agent_id = $1', [req.params.id]);
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

// ─── TEST EMAIL ───────────────────────────────────────────────────────────────

router.post('/test-email', async (req, res) => {
  const to = req.body.to || process.env.SMTP_USER;
  if (!to) return res.status(400).json({ error: 'Provide a "to" email address or set SMTP_USER in .env' });

  console.log(`[EMAIL] Admin triggered test email → ${to}`);

  const smtpOk = await verifySmtpConnection();
  if (!smtpOk) {
    return res.status(503).json({
      status: 'not_configured',
      message: 'SMTP connection failed or not configured. Check backend terminal for details.',
      fix: 'Set SMTP_PASS to a Gmail App Password in backend/.env, then restart the server. Generate one at https://myaccount.google.com/apppasswords',
    });
  }

  try {
    const result = await sendEmail({
      to,
      subject: 'Test Email — Orlando Superhost',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0D2B6B">✅ Email is working!</h2>
          <p>This is a test email sent from the Orlando Superhost admin panel.</p>
          <p style="color:#888;font-size:13px">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    if (result?.skipped) {
      return res.json({
        status: 'skipped',
        message: 'Email skipped — SMTP_PASS is still the placeholder value in backend/.env',
        fix: 'Replace SMTP_PASS=your-gmail-app-password-here with your actual Gmail App Password and restart the server.',
      });
    }

    console.log(`[EMAIL] ✓ Test email delivered to ${to} — messageId: ${result.messageId}`);
    res.json({ status: 'sent', to, messageId: result.messageId });
  } catch (err) {
    console.error('[EMAIL] Test email error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

module.exports = router;
