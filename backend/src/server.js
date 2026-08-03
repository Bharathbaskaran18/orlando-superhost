require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { verifySmtpConnection } = require('./utils/email');
const { startAgreementTimerJob } = require('./jobs/agreementTimer');
const { startHouseCheckinJob }   = require('./jobs/houseCheckinJob');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api', require('./routes/states'));
app.use('/api', require('./routes/listings'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/leasing', require('./routes/leasing'));
app.use('/api/admin', require('./routes/adminLeasing'));
app.use('/api/car-rental', require('./routes/carRental'));
app.use('/api/admin', require('./routes/adminCarRental'));
app.use('/api/house-booking', require('./routes/houseBooking'));
app.use('/api/admin', require('./routes/adminHouseBookings'));
app.use('/api/agent-booking', require('./routes/agentBooking'));
app.use('/api/admin', require('./routes/adminAgentBookings'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Orlando Superhost' }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`Orlando Superhost server running on http://localhost:${PORT}`);
  console.log('Stripe configured:', !!process.env.STRIPE_SECRET_KEY);
  await verifySmtpConnection();
  startAgreementTimerJob();
  startHouseCheckinJob();
});
