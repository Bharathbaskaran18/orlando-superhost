-- Add new fields to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS min_hours INTEGER DEFAULT 2;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_hours INTEGER DEFAULT 8;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS available_days TEXT[];
ALTER TABLE agents ADD COLUMN IF NOT EXISTS meeting_location TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create agent_bookings table
CREATE TABLE IF NOT EXISTS agent_bookings (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours NUMERIC(4,2) NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL,
  rental_cost NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'payment_pending',
  customer_first_name VARCHAR(100),
  customer_last_name VARCHAR(100),
  customer_full_name VARCHAR(200),
  customer_dob DATE,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  customer_address TEXT,
  id_type VARCHAR(50),
  id_photo VARCHAR(255),
  purpose VARCHAR(100),
  special_requests TEXT,
  cancellation_reason TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_bookings_agent_date ON agent_bookings(agent_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_agent_bookings_user ON agent_bookings(user_id);
