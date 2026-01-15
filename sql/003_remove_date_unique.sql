-- Quitar constraint UNIQUE de date para permitir múltiples menús por fecha
ALTER TABLE menus DROP CONSTRAINT IF EXISTS menus_date_key;
