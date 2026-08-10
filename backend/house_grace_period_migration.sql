-- Grace period + late payment fee for monthly house leases
-- Run: psql -d bookingapp -f house_grace_period_migration.sql

ALTER TABLE houses ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 5;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS late_payment_fee NUMERIC(10,2) DEFAULT 0;
