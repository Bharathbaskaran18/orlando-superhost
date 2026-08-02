-- Leasing feature - new tables only (does NOT modify existing tables)
-- Run: psql -d bookingapp -f leasing_schema.sql

CREATE TABLE IF NOT EXISTS lease_properties (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  num_rooms INTEGER NOT NULL,
  num_bedrooms INTEGER NOT NULL,
  num_bathrooms INTEGER NOT NULL,
  price_per_month DECIMAL(10,2) NOT NULL,
  photos TEXT[] DEFAULT '{}',
  lease_agreement_pdf VARCHAR(500),
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lease_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  property_id INTEGER NOT NULL REFERENCES lease_properties(id) ON DELETE CASCADE,
  status VARCHAR(60) DEFAULT 'step1_pending' NOT NULL,
  full_name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  current_address TEXT,
  reason_for_moving TEXT,
  monthly_income DECIMAL(10,2),
  num_occupants INTEGER,
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lease_application_step2 (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES lease_applications(id) ON DELETE CASCADE,
  id_photo VARCHAR(500),
  income_proof VARCHAR(500),
  rental_history VARCHAR(500),
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relation VARCHAR(100),
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(application_id)
);

CREATE TABLE IF NOT EXISTS lease_appointments (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES lease_applications(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  confirmed_date DATE,
  confirmed_time TIME,
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(application_id)
);

CREATE INDEX IF NOT EXISTS idx_lease_properties_city ON lease_properties(city_id);
CREATE INDEX IF NOT EXISTS idx_lease_applications_user ON lease_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_lease_applications_property ON lease_applications(property_id);
