import { getMenu, getOrdersStatus } from '@/lib/db';
import { verifySlackRequest, parseSlashCommand, ephemeral } from '@/lib/slack';
import { cleanCategoryName } from '@/lib/utils';
import type { Category } from '@/lib/types';

/**
 * Slack slash command: /menu
 *
 * Returns the full day's menu as an ephemeral message (only visible to sender).
 * Also shows whether orders are currently open or closed.
 *
 * Configure in Slack App → Slash Commands:
 *   Command:     /menu
 *   Request URL: https://<your-domain>/api/slack/menu
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  // ── Verify signature ──
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (signingSecret && !verifySlackRequest(signingSecret, request.headers, rawBody)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { userName } = parseSlashCommand(rawBody);
  console.log('[Slack /menu] requested by:', userName);

  const date = new Date().toISOString().split('T')[0];

  // ── Fetch menu and status in parallel ──
  const [menu, status] = await Promise.all([
    getMenu(date),
    getOrdersStatus(date),
  ]);

  if (!menu) {
    return ephemeral(`No hay menú cargado para hoy (${date}). Contactá al administrador.`);
  }

  const categories = (menu as { categories: Category[] }).categories;

  let text = `*🍽️ Menú del ${date}*\n`;
  text += status === 'open'
    ? `_✅ Los pedidos están abiertos — usá /order para pedir_\n\n`
    : `_🔒 Los pedidos están cerrados_\n\n`;

  for (const cat of categories) {
    const catName = cleanCategoryName(cat.name);
    text += `*── ${catName} ──*\n`;
    if (cat.notes) text += `_${cat.notes}_\n`;
    if (cat.categoryOptions) {
      text += `${cat.categoryOptions.label}: ${cat.categoryOptions.options.join(', ')}\n`;
    }
    for (const dish of cat.dishes) {
      text += `  • *${dish.name}*`;
      if (dish.description) text += ` — ${dish.description}`;
      if (dish.options?.length) text += ` _(${dish.options.join(' / ')})_`;
      text += '\n';
    }
    text += '\n';
  }

  return ephemeral(text.trimEnd());
}
