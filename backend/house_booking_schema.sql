-- House Booking Feature Schema
-- Run: psql -d bookingapp -f house_booking_schema.sql

-- ── Extend houses table ───────────────────────────────────────────────────────
ALTER TABLE houses ADD COLUMN IF NOT EXISTS bedrooms          INTEGER           DEFAULT 1;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS deposit_amount    DECIMAL(10,2)     DEFAULT 0;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS max_guests        INTEGER           DEFAULT 4;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS extra_guest_fee   DECIMAL(10,2)     DEFAULT 0;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS late_checkout_fee DECIMAL(10,2)     DEFAULT 25;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS checkin_time      TIME              DEFAULT '15:00:00';
ALTER TABLE houses ADD COLUMN IF NOT EXISTS checkout_time     TIME              DEFAULT '11:00:00';
ALTER TABLE houses ADD COLUMN IF NOT EXISTS pets_allowed      BOOLEAN           DEFAULT false;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS house_rules       TEXT;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS checkin_instructions TEXT;

-- ── house_bookings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS house_bookings (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  house_id        INTEGER NOT NULL REFERENCES houses(id),

  checkin_date    DATE    NOT NULL,
  checkout_date   DATE    NOT NULL,
  total_nights    INTEGER NOT NULL,
  num_guests      INTEGER NOT NULL DEFAULT 1,
  pets            BOOLEAN          DEFAULT false,

  price_per_night       DECIMAL(10,2) NOT NULL,
  rental_cost           DECIMAL(10,2) NOT NULL,
  extra_guest_fee_total DECIMAL(10,2) DEFAULT 0,
  deposit_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount          DECIMAL(10,2) NOT NULL,

  status          VARCHAR(30) NOT NULL DEFAULT 'pending_approval',

  customer_first_name VARCHAR(100),
  customer_last_name  VARCHAR(100),
  customer_full_name  VARCHAR(200),
  customer_dob        DATE,
  customer_phone      VARCHAR(50),
  customer_email      VARCHAR(255),
  customer_address    TEXT,
  special_requests    TEXT,

  id_type  VARCHAR(50),
  id_photo VARCHAR(500),

  -- checkout details
  actual_checkout_date       DATE,
  actual_checkout_time       TIME,
  actual_num_guests          INTEGER,
  property_condition         VARCHAR(20),
  damage_description         TEXT,
  damage_photos              TEXT,
  damage_repair_cost         DECIMAL(10,2),
  cleaning_fee               DECIMAL(10,2),
  late_checkout_fee_charged  DECIMAL(10,2),
  actual_extra_guest_fee     DECIMAL(10,2),
  checkout_notes             TEXT,

  checkin_email_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hb_user   ON house_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_hb_house  ON house_bookings(house_id);
CREATE INDEX IF NOT EXISTS idx_hb_status ON house_bookings(status);
CREATE INDEX IF NOT EXISTS idx_hb_dates  ON house_bookings(checkin_date, checkout_date);
