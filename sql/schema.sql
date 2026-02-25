-- GoFeedMe Database Schema
-- This script creates all necessary tables from scratch
-- Includes all changes from previous migrations

-- Master menus table (reusable templates)
CREATE TABLE IF NOT EXISTS master_menus (
  id SERIAL PRIMARY KEY,
  menu_name VARCHAR(100) NOT NULL,
  menu_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Daily menus table
CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  menu_json JSONB NOT NULL,
  menu_name VARCHAR(100),
  master_menu_id INTEGER REFERENCES master_menus(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  dish VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Configuration table (orders status)
CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'closed')),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes to optimize queries
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category);
CREATE INDEX IF NOT EXISTS idx_menus_date ON menus(date);
CREATE INDEX IF NOT EXISTS idx_config_date ON config(date);
CREATE INDEX IF NOT EXISTS idx_master_menus_name ON master_menus(menu_name);
