-- Agregar campo para nombre del menú
ALTER TABLE menus ADD COLUMN IF NOT EXISTS menu_name VARCHAR(100);
