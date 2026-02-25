-- Add category field to orders table
-- This allows showing "Category DISH" in the order summary

ALTER TABLE orders ADD COLUMN IF NOT EXISTS category VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category);
