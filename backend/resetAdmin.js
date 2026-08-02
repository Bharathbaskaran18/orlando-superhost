const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetAdmin() {
  const hash = await bcrypt.hash('Admin@123', 12);
  const result = await pool.query(
    `UPDATE users SET email = $1, password_hash = $2 WHERE role = 'admin' RETURNING id, email, role`,
    ['admin@orlandosuperhost.com', hash]
  );
  if (result.rows.length === 0) {
    console.log('No admin user found — inserting one...');
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      ['Admin', 'admin@orlandosuperhost.com', hash]
    );
    console.log('Admin user created.');
  } else {
    console.log('Admin password reset successfully');
    console.log('  id:', result.rows[0].id);
    console.log('  email:', result.rows[0].email);
  }
  await pool.end();
}

resetAdmin().catch(err => { console.error(err.message); process.exit(1); });
