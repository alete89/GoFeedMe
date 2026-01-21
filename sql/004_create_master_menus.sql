-- Crear tabla maestra de menús
CREATE TABLE IF NOT EXISTS master_menus (
  id SERIAL PRIMARY KEY,
  menu_name VARCHAR(100) NOT NULL,
  menu_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Modificar tabla menus para referenciar a master_menus
ALTER TABLE menus ADD COLUMN IF NOT EXISTS master_menu_id INTEGER REFERENCES master_menus(id);

-- Crear índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_master_menus_name ON master_menus(menu_name);

-- Migrar datos existentes: copiar menús únicos a master_menus
INSERT INTO master_menus (menu_name, menu_json, created_at)
SELECT 
  COALESCE(menu_name, 'Menú del ' || TO_CHAR(date, 'DD/MM/YYYY')) as menu_name,
  menu_json,
  MIN(created_at) as created_at
FROM menus
GROUP BY menu_json, menu_name
ON CONFLICT DO NOTHING;

-- Actualizar referencias en la tabla menus
UPDATE menus m
SET master_menu_id = mm.id
FROM master_menus mm
WHERE m.menu_json = mm.menu_json;
