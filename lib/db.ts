import 'server-only';
import { sql } from '@vercel/postgres';

interface MenuJson {
  categories: { name: string; dishes: string[] }[];
}

export async function getMenu(date: string) {
  try {
    const result = await sql`
      SELECT menu_json 
      FROM menus 
      WHERE date = ${date}
      ORDER BY id DESC
      LIMIT 1
    `;
    return result.rows[0]?.menu_json || null;
  } catch (error) {
    console.error('Error getting menu:', error);
    return null;
  }
}

export async function saveMenu(date: string, menuJson: MenuJson, menuName?: string) {
  await sql`
    INSERT INTO menus (date, menu_json, menu_name)
    VALUES (${date}, ${JSON.stringify(menuJson)}, ${menuName || null})
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

export async function getUniqueMenus() {
  try {
    const result = await sql`
      SELECT DISTINCT ON (menu_json) 
        date, menu_json, menu_name, created_at
      FROM menus 
      ORDER BY menu_json, date DESC
      LIMIT 20
    `;
    return result.rows;
  } catch (error) {
    console.error('Error getting unique menus:', error);
    return [];
  }
}
