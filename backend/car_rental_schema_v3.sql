-- Car Rental Schema v3 — return flow, admin signature, extra charges, timers
-- Run once: psql -d bookingapp -f backend/car_rental_schema_v3.sql

-- ── Return inspection fields ──────────────────────────────────────────────────
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS actual_return_date DATE;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS actual_return_time TIME;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS odometer_at_return INTEGER;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS fuel_level_at_return VARCHAR(50);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS fuel_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS condition_at_return VARCHAR(50);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS damage_description TEXT;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS damage_photos TEXT;       -- JSON array of filenames
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS return_type VARCHAR(50);  -- 'no_charges' | 'with_charges'
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS return_notes TEXT;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMPTZ;

-- ── Extra mileage ─────────────────────────────────────────────────────────────
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS extra_miles_driven DECIMAL(10,2) DEFAULT 0;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS extra_mileage_fee DECIMAL(10,2) DEFAULT 0;

-- ── Extra charge (when fees exceed deposit) ───────────────────────────────────
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS extra_charge_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS extra_charge_stripe_id VARCHAR(255);

-- ── Admin signature ───────────────────────────────────────────────────────────
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS admin_signature_name VARCHAR(255);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS admin_signature_title VARCHAR(255);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS admin_signed_at TIMESTAMPTZ;

-- ── Customer signature name (typed name, separate from base64 signature PNG) ─
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS customer_signature_name VARCHAR(255);

-- ── Agreement timer (24-hour auto-cancel) ────────────────────────────────────
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS agreement_reminder_sent_at TIMESTAMPTZ;
