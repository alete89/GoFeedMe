import 'server-only';
import crypto from 'crypto';
import { WebClient } from '@slack/web-api';
import { getMenu, getOrders, getOrdersStatus } from './db';
import { placeOrder } from './orderService';
import { cleanCategoryName } from './utils';
import type { Category } from './types';

// ─── Slack Request Signature Verification ────────────────────────────

export function verifySlackRequest(
  signingSecret: string,
  headers: Headers,
  rawBody: string
): boolean {
  const timestamp = headers.get('x-slack-request-timestamp');
  const signature = headers.get('x-slack-signature');
  if (!timestamp || !signature) return false;

  // Reject requests older than 5 minutes (replay attack protection)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) return false;

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature =
    'v0=' +
    crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

// ─── Intent Detection ────────────────────────────────────────────────

interface MenuIntent {
  type: 'menu';
}
interface OrdersIntent {
  type: 'orders';
}
interface StatusIntent {
  type: 'status';
}
interface OrderIntent {
  type: 'order';
  dish: string;
  option?: string;
  categoryOption?: string;
  observations?: string;
}
interface HelpIntent {
  type: 'help';
}
interface UnknownIntent {
  type: 'unknown';
}

type Intent =
  | MenuIntent
  | OrdersIntent
  | StatusIntent
  | OrderIntent
  | HelpIntent
  | UnknownIntent;

/**
 * Parse a Slack message into a structured intent.
 *
 * Order format: `pedir <plato> | <opción> | <guarnición> | <observaciones>`
 * Only the dish name is required; the rest are optional pipe-separated parts.
 */
export function detectIntent(rawText: string): Intent {
  // Remove bot mentions (<@U0123ABC>) and extra whitespace
  const text = rawText.replace(/<@[A-Z0-9]+>/gi, '').trim();
  const lower = text.toLowerCase();

  // Help
  if (/\b(ayuda|help|comandos|commands|qué puedo|que puedo)\b/.test(lower)) {
    return { type: 'help' };
  }

  // Menu
  if (/\b(menú|menu|carta|qué hay|que hay|platos)\b/.test(lower)) {
    return { type: 'menu' };
  }

  // Status
  if (/\b(estado|abiertos?|cerrados?|status|se puede pedir)\b/.test(lower)) {
    return { type: 'status' };
  }

  // Orders list
  if (/\b(pedidos|qué pidieron|que pidieron|resumen|listado)\b/.test(lower)) {
    return { type: 'orders' };
  }

  // Place order – "pedir PLATO", "quiero PLATO", "pedime PLATO", "pedí PLATO"
  const orderMatch = lower.match(
    /\b(?:pedir|quiero|pedime|pedí)\s+(.+)/
  );
  if (orderMatch) {
    const parts = orderMatch[1].split('|').map((p) => p.trim());
    const skip = (v: string | undefined) =>
      v && v !== '-' && v !== '' ? v : undefined;
    return {
      type: 'order',
      dish: parts[0],
      option: skip(parts[1]),
      categoryOption: skip(parts[2]),
      observations: skip(parts[3]),
    };
  }

  return { type: 'unknown' };
}

// ─── Message Handlers ────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

async function handleMenu(): Promise<string> {
  const date = todayDate();
  const menu = await getMenu(date);

  if (!menu) {
    return `No hay menú cargado para hoy (${date}). Contactá al administrador.`;
  }

  const categories = (menu as { categories: Category[] }).categories;
  let msg = `*🍽️ Menú del día (${date})*\n\n`;

  for (const cat of categories) {
    const catName = cleanCategoryName(cat.name);
    msg += `*── ${catName} ──*\n`;
    if (cat.notes) msg += `_${cat.notes}_\n`;
    if (cat.categoryOptions) {
      msg += `${cat.categoryOptions.label}: ${cat.categoryOptions.options.join(', ')}\n`;
    }
    for (const dish of cat.dishes) {
      msg += `  • *${dish.name}*`;
      if (dish.description) msg += ` — ${dish.description}`;
      if (dish.options?.length) msg += ` _(${dish.options.join(' / ')})_`;
      msg += '\n';
    }
    msg += '\n';
  }

  return msg;
}

async function handleStatus(): Promise<string> {
  const date = todayDate();
  const status = await getOrdersStatus(date);
  return status === 'open'
    ? `✅ Los pedidos para hoy (${date}) están *abiertos*. ¡Podés hacer tu pedido!`
    : `🔒 Los pedidos para hoy (${date}) están *cerrados*. Ya no se aceptan más pedidos.`;
}

async function handleOrders(): Promise<string> {
  const date = todayDate();
  const orders = await getOrders(date);

  if (orders.length === 0) {
    return `No hay pedidos todavía para hoy (${date}).`;
  }

  let msg = `*📋 Pedidos de hoy (${date}) — ${orders.length} total*\n\n`;
  for (const order of orders) {
    msg += `• *${order.name}*: ${order.dish}`;
    if (order.category) msg += ` [${order.category}]`;
    if (order.observations) msg += ` — _"${order.observations}"_`;
    msg += ` (${order.time})\n`;
  }

  return msg;
}

async function handleOrder(
  intent: OrderIntent,
  userName: string
): Promise<string> {
  const result = await placeOrder({
    name: userName,
    dish: intent.dish,
    option: intent.option,
    category_option: intent.categoryOption,
    observations: intent.observations,
  });

  if (!result.success) {
    switch (result.errorCode) {
      case 'CLOSED':
        return `🔒 ${result.error}`;
      case 'NO_MENU':
        return result.error!;
      case 'DISH_NOT_FOUND':
        return `❌ ${result.error}\n\nPlatos disponibles:\n${result.errorData?.availableDishes}`;
      case 'OPTION_REQUIRED':
        return (
          `⚠️ ${result.error}\n` +
          `Opciones: ${(result.errorData?.options as string[]).join(', ')}\n\n` +
          `_Usá:_ \`pedir ${intent.dish} | <opción>\``
        );
      case 'INVALID_OPTION':
        return (
          `❌ ${result.error}\n` +
          `Opciones válidas: ${(result.errorData?.options as string[]).join(', ')}`
        );
      case 'CATEGORY_OPTION_REQUIRED':
        return (
          `⚠️ ${result.error}\n` +
          `Opciones: ${(result.errorData?.options as string[]).join(', ')}\n\n` +
          `_Usá:_ \`pedir ${intent.dish} | ${intent.option || '-'} | <opción>\``
        );
      case 'INVALID_CATEGORY_OPTION':
        return (
          `❌ ${result.error}\n` +
          `Opciones válidas: ${(result.errorData?.options as string[]).join(', ')}`
        );
      case 'DUPLICATE_NAME': {
        const existing = result.errorData?.existingOrder as {
          name: string;
          dish: string;
          time: string;
        };
        return `⚠️ Ya tenés un pedido: "${existing.dish}" (${existing.time}). Contactá al admin si querés cambiarlo.`;
      }
      default:
        return `❌ ${result.error || 'Error desconocido.'}`;
    }
  }

  const order = result.order!;
  let msg = `✅ *¡Pedido registrado!*\n\n`;
  msg += `👤 ${order.name}\n`;
  msg += `🍽️ ${order.dish}\n`;
  msg += `📂 ${order.category}\n`;
  if (order.observations) msg += `📝 ${order.observations}\n`;
  msg += `🕐 ${order.time}`;
  return msg;
}

function helpMessage(): string {
  return [
    '*🤖 GoFeedMe Bot — Comandos disponibles*\n',
    '• `menú` — Ver el menú del día',
    '• `pedidos` — Ver los pedidos realizados hoy',
    '• `estado` — Saber si los pedidos están abiertos o cerrados',
    '• `pedir <plato>` — Hacer un pedido',
    '• `pedir <plato> | <opción>` — Pedido con variante (ej: Ternera, Pollo)',
    '• `pedir <plato> | <opción> | <guarnición>` — Con opción + guarnición',
    '• `pedir <plato> | <opción> | <guarnición> | <observaciones>` — Pedido completo',
    '• `ayuda` — Ver este mensaje\n',
    '_Tip: Podés escribirme por DM o mencionarme en un canal con @GoFeedMe._',
  ].join('\n');
}

function unknownMessage(): string {
  return 'No entendí tu mensaje 🤔. Escribí *ayuda* para ver los comandos disponibles.';
}

// ─── Main Event Processor ────────────────────────────────────────────

/**
 * Process a Slack event (app_mention or direct message) and reply.
 */
export async function processSlackEvent(
  event: Record<string, unknown>,
  botUserId: string
): Promise<void> {
  // Ignore bot's own messages
  if (event.bot_id || event.user === botUserId) return;

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error('[Slack] SLACK_BOT_TOKEN is not set');
    return;
  }

  const slackClient = new WebClient(token);
  const channel = event.channel as string;
  const text = (event.text as string) || '';

  // Resolve the user's display name (used for orders)
  let userName = 'Usuario';
  try {
    const userInfo = await slackClient.users.info({ user: event.user as string });
    userName =
      userInfo.user?.real_name || userInfo.user?.name || 'Usuario';
  } catch (e) {
    console.error('[Slack] Error fetching user info:', e);
  }

  // Detect intent and build response
  const intent = detectIntent(text);
  let response: string;

  switch (intent.type) {
    case 'help':
      response = helpMessage();
      break;
    case 'menu':
      response = await handleMenu();
      break;
    case 'status':
      response = await handleStatus();
      break;
    case 'orders':
      response = await handleOrders();
      break;
    case 'order':
      response = await handleOrder(intent, userName);
      break;
    default:
      response = unknownMessage();
  }

  // Reply in the same channel (thread-aware)
  await slackClient.chat.postMessage({
    channel,
    text: response,
    ...(event.thread_ts ? { thread_ts: event.thread_ts as string } : {}),
  });
}
