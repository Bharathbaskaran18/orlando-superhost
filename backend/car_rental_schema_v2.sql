-- Car Rental Flow v2 — run once to add new columns
-- psql -d bookingapp -f backend/car_rental_schema_v2.sql

ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS dl_photo VARCHAR(500);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS is_late_return BOOLEAN DEFAULT FALSE;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS late_return_hours DECIMAL(10,2);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS late_return_fee DECIMAL(10,2);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS damage_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS deposit_refund_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS deposit_refunded_amount DECIMAL(10,2);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS deposit_stripe_refund_id VARCHAR(255);
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS rental_agreement_sent_at TIMESTAMP;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS customer_signed_at TIMESTAMP;
ALTER TABLE car_rental_bookings ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;
