require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/states'));
app.use('/api', require('./routes/listings'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Plan With Us' }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Plan With Us server running on http://localhost:${PORT}`));
