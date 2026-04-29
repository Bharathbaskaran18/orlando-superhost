-- Plan With Us - Complete Database Schema
-- Run: psql -d bookingapp -f schema.sql

DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS houses CASCADE;
DROP TABLE IF EXISTS cars CASCADE;
DROP TABLE IF EXISTS attractions CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS states CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE states (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  code CHAR(2) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(state_id, name)
);

CREATE TABLE attractions (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cars (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  seats INTEGER NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  photos TEXT[] DEFAULT '{}',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE houses (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  rooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  photos TEXT[] DEFAULT '{}',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(200) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  photo VARCHAR(500),
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('car', 'house', 'agent')),
  item_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  total_price DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_item ON bookings(booking_type, item_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_cars_city ON cars(city_id);
CREATE INDEX idx_houses_city ON houses(city_id);
CREATE INDEX idx_agents_city ON agents(city_id);
CREATE INDEX idx_cities_state ON cities(state_id);
