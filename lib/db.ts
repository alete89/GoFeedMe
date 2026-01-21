import 'server-only';
import { sql } from '@vercel/postgres';

interface MenuJson {
  categories: { name: string; dishes: string[] }[];
}

export async function getMenu(date: string) {
  try {
    const result = await sql`
      SELECT mm.menu_json 
      FROM menus m
      JOIN master_menus mm ON m.master_menu_id = mm.id
      WHERE m.date = ${date}
      ORDER BY m.id DESC
      LIMIT 1
    `;
    return result.rows[0]?.menu_json || null;
  } catch (error) {
    console.error('Error getting menu:', error);
    return null;
  }
}

export async function saveMenu(date: string, menuJson: MenuJson, menuName?: string) {
  // Primero, buscar si ya existe un menú maestro con ese contenido
  const existingMaster = await sql`
    SELECT id FROM master_menus
    WHERE menu_json = ${JSON.stringify(menuJson)}
    LIMIT 1
  `;
  
  let masterMenuId: number;
  
  if (existingMaster.rows.length > 0) {
    // Ya existe, usar el id existente
    masterMenuId = existingMaster.rows[0].id;
  } else {
    // No existe, crear uno nuevo
    const newMaster = await sql`
      INSERT INTO master_menus (menu_name, menu_json)
      VALUES (${menuName || 'Menú sin nombre'}, ${JSON.stringify(menuJson)})
      RETURNING id
    `;
    masterMenuId = newMaster.rows[0].id;
  }
  
  // Insertar la referencia para la fecha específica
  await sql`
    INSERT INTO menus (date, menu_json, menu_name, master_menu_id)
    VALUES (${date}, ${JSON.stringify(menuJson)}, ${menuName || null}, ${masterMenuId})
  `;
}

export async function saveOrder(order: {
  date: string;
  time: string;
  name: string;
  dish: string;
  observations?: string;
}) {
  await sql`
    INSERT INTO orders (date, time, name, dish, observations)
    VALUES (${order.date}, ${order.time}, ${order.name}, ${order.dish}, ${order.observations || null})
  `;
}

export async function getOrders(date: string) {
  const result = await sql`
    SELECT * FROM orders 
    WHERE date = ${date}
    ORDER BY created_at ASC
  `;
  return result.rows;
}

export async function getOrdersStatus(date: string) {
  try {
    const result = await sql`
      SELECT status FROM config 
      WHERE date = ${date}
      LIMIT 1
    `;
    return result.rows[0]?.status || 'open';
  } catch (error) {
    return 'open';
  }
}

export async function setOrdersStatus(date: string, status: 'open' | 'closed') {
  await sql`
    INSERT INTO config (date, status)
    VALUES (${date}, ${status})
    ON CONFLICT (date) 
    DO UPDATE SET status = ${status}, updated_at = NOW()
  `;
}

export async function deleteOrder(orderId: number) {
  await sql`
    DELETE FROM orders 
    WHERE id = ${orderId}
  `;
}

export async function deleteMasterMenu(masterMenuId: number) {
  // Primero eliminar todas las referencias en la tabla menus
  await sql`
    DELETE FROM menus 
    WHERE master_menu_id = ${masterMenuId}
  `;
  
  // Luego eliminar el menú maestro
  await sql`
    DELETE FROM master_menus 
    WHERE id = ${masterMenuId}
  `;
}

export async function getUniqueMenus() {
  try {
    const result = await sql`
      SELECT id, menu_name, menu_json, created_at
      FROM master_menus 
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return result.rows;
  } catch (error) {
    console.error('Error getting unique menus:', error);
    return [];
  }
}

export async function getMasterMenu(id: number) {
  try {
    const result = await sql`
      SELECT id, menu_name, menu_json, created_at
      FROM master_menus
      WHERE id = ${id}
      LIMIT 1
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting master menu:', error);
    return null;
  }
}

export async function saveMenuFromMaster(date: string, masterMenuId: number) {
  const masterMenu = await getMasterMenu(masterMenuId);
  if (!masterMenu) {
    throw new Error('Master menu not found');
  }
  
  await sql`
    INSERT INTO menus (date, menu_json, menu_name, master_menu_id)
    VALUES (${date}, ${JSON.stringify(masterMenu.menu_json)}, ${masterMenu.menu_name}, ${masterMenuId})
  `;
}
