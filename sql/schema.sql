CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  menu_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  dish VARCHAR(255) NOT NULL,
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'closed')),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_menus_date ON menus(date);
CREATE INDEX IF NOT EXISTS idx_config_date ON config(date);
