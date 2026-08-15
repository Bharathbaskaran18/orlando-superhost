require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sendEmail } = require('./utils/resendEmail');
const { startAgreementTimerJob } = require('./jobs/agreementTimer');
const { startHouseCheckinJob }   = require('./jobs/houseCheckinJob');
const { startHousePaymentReminderJob } = require('./jobs/housePaymentReminderJob');

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
  console.log(`Orlando Superhost server running on port ${PORT}`);
  console.log('Stripe key exists:', !!process.env.STRIPE_SECRET_KEY);
  console.log('Stripe key prefix:', process.env.STRIPE_SECRET_KEY?.substring(0, 12));
  console.log('[RESEND] configured:', !!process.env.RESEND_API_KEY);
  console.log('[RESEND] key prefix:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 6) : '(not set)');

  // ── Startup diagnostic: confirm Resend can actually deliver an email ──
  sendEmail({
    to: 'orlandosuperhost@gmail.com',
    subject: 'Test Email from Orlando Superhost',
    html: '<h1>Email is working!</h1>',
  }).then(r => console.log('[TEST EMAIL] Result:', r))
    .catch(e => console.error('[TEST EMAIL] Error:', e.message));

  startAgreementTimerJob();
  startHouseCheckinJob();
  startHousePaymentReminderJob();
});
