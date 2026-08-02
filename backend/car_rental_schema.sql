-- Car Rental Feature — new columns + table
-- Run: psql -d bookingapp -f car_rental_schema.sql

-- Add rental-specific fields to the existing cars table
ALTER TABLE cars ADD COLUMN IF NOT EXISTS license_plate VARCHAR(50);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS vin_number VARCHAR(100);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS mileage_cap_per_day INTEGER;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS overage_rate_per_mile DECIMAL(10,2);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS additional_driver_fee_per_day DECIMAL(10,2);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;

-- Full car rental bookings table (separate from the generic bookings table)
CREATE TABLE IF NOT EXISTS car_rental_bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  car_id  INTEGER NOT NULL REFERENCES cars(id),

  -- Rental window
  pickup_date  DATE NOT NULL,
  pickup_time  TIME NOT NULL,
  return_date  DATE NOT NULL,
  return_time  TIME NOT NULL,
  total_days   INTEGER NOT NULL,

  -- Pricing snapshot taken at booking time
  daily_rate        DECIMAL(10,2) NOT NULL,
  rental_cost       DECIMAL(10,2) NOT NULL,
  deposit_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(10,2) NOT NULL,

  -- Status: pending_approval | payment_pending | confirmed | cancelled
  status VARCHAR(30) DEFAULT 'pending_approval' NOT NULL,

  -- Customer personal info (Step 2)
  customer_full_name VARCHAR(200),
  customer_dob       DATE,
  customer_address   TEXT,
  customer_phone     VARCHAR(50),
  customer_email     VARCHAR(255),

  -- Driver licence
  dl_number     VARCHAR(100),
  dl_state      VARCHAR(50),
  dl_expiration DATE,

  -- Insurance
  insurance_company            VARCHAR(200),
  insurance_policy_number      VARCHAR(100),
  insurance_policy_expiration  DATE,
  insurance_liability_limits   VARCHAR(200),
  insurance_covers_rental      VARCHAR(20),   -- 'yes' | 'no' | 'unknown'

  -- Admin fills at approval
  odometer_at_pickup   INTEGER,
  fuel_level_at_pickup VARCHAR(50),
  admin_notes          TEXT,

  -- Generated PDF path
  rental_agreement_pdf VARCHAR(500),

  -- Customer signature (base64 PNG)
  customer_signature TEXT,

  -- Stripe
  stripe_payment_intent_id VARCHAR(255),

  -- Link to generic bookings table — set when payment confirmed (for date-blocking)
  booking_id INTEGER REFERENCES bookings(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crb_user ON car_rental_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_crb_car  ON car_rental_bookings(car_id);
