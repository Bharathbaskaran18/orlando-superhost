-- Monthly Rental Migration
-- Converts house booking model from nightly stays to monthly leases.
-- Run: psql -d bookingapp -f house_monthly_migration.sql

-- ── houses ──────────────────────────────────────────────────────────────────
ALTER TABLE houses ADD COLUMN IF NOT EXISTS price_per_month  NUMERIC(10,2);
ALTER TABLE houses ADD COLUMN IF NOT EXISTS min_rental_months INTEGER DEFAULT 1;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS max_rental_months INTEGER DEFAULT 12;

-- Backfill price_per_month for any existing rows from the old nightly price
UPDATE houses SET price_per_month = ROUND(price_per_night * 30, 2) WHERE price_per_month IS NULL;

-- price_per_night is no longer collected by the admin form — stop requiring it
ALTER TABLE houses ALTER COLUMN price_per_night DROP NOT NULL;

-- ── house_bookings ──────────────────────────────────────────────────────────
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS total_months       INTEGER;
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS monthly_rent       NUMERIC(10,2);
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS move_in_date       DATE;
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS move_out_date      DATE;
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS next_payment_date  DATE;
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS payment_schedule   JSONB;

-- Simple move-out / deposit settlement (replaces nightly damage/cleaning inspection)
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS deposit_refund_status  VARCHAR(20); -- 'full' | 'partial' | 'withheld'
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS deposit_refund_amount  NUMERIC(10,2);
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS deposit_refund_notes   TEXT;
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS moved_out_at           TIMESTAMP;

-- Old nightly-stay columns are no longer populated by new bookings
ALTER TABLE house_bookings ALTER COLUMN checkin_date    DROP NOT NULL;
ALTER TABLE house_bookings ALTER COLUMN checkout_date   DROP NOT NULL;
ALTER TABLE house_bookings ALTER COLUMN total_nights    DROP NOT NULL;
ALTER TABLE house_bookings ALTER COLUMN price_per_night DROP NOT NULL;
ALTER TABLE house_bookings ALTER COLUMN rental_cost     DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hb_move_in  ON house_bookings(move_in_date);
CREATE INDEX IF NOT EXISTS idx_hb_next_pay ON house_bookings(next_payment_date);
