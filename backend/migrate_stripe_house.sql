-- Add Stripe payment intent column to house_bookings
ALTER TABLE house_bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
