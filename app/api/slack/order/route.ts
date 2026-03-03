import { verifySlackRequest, parseSlashCommand, ephemeral } from '@/lib/slack';
import { placeOrder } from '@/lib/orderService';

/**
 * Slack slash command: /order
 *
 * Places a food order on behalf of the Slack user.
 *
 * Syntax:
 *   /pedir <plato>
 *   /pedir <plato>, <opción>
 *   /pedir <plato>, <opción>, <guarnición o salsa>
 *   /pedir <plato>, <opción>, <guarnición o salsa>; <observaciones>
 *   /pedir <plato>, <guarnición o salsa>          ← shortcut when dish has no options
 *
 * The semicolon separates the order from free-text observations.
 * Commas separate dish → option → category option.
 *
 * Examples:
 *   /pedir ravioles
 *   /pedir milanesa, pollo
 *   /pedir milanesa, pollo, ensalada mixta
 *   /pedir milanesa, pollo, ensalada mixta; sin cebolla
 *   /pedir pollo grillado, ensalada mixta
 *   /pedir pollo grillado; sin sal y bien cocido
 *
 * Configure in Slack App → Slash Commands:
 *   Command:     /order
 *   Request URL: https://<your-domain>/api/slack/order
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  // ── Verify signature ──
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (signingSecret && !verifySlackRequest(signingSecret, request.headers, rawBody)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { text, userName } = parseSlashCommand(rawBody);
  console.log('[Slack /order] user:', userName, '| text:', text);

  // ── Show usage if no text provided ──
  if (!text.trim()) {
    return ephemeral(
      '*Uso:* `/pedir <plato>`\n\n' +
      'Con opciones:\n' +
      '  `/pedir <plato>, <opción>`\n' +
      '  `/pedir <plato>, <guarnición>`  _(si el plato no tiene variantes)_\n' +
      '  `/pedir <plato>, <opción>, <guarnición>; <observaciones>`\n\n' +
      'Ejemplos:\n' +
      '  `/pedir ravioles`\n' +
      '  `/pedir milanesa, pollo`\n' +
      '  `/pedir pollo grillado, papas fritas`\n' +
      '  `/pedir milanesa, pollo, ensalada mixta; sin cebolla`\n\n' +
      '_Primero usá `/menu` para ver los platos disponibles._'
    );
  }

  // ── Parse ──
  // Semicolon separates the order from free-text observations
  const [orderPart, observationsPart] = text.split(';').map((s) => s.trim());
  const observations = observationsPart || undefined;

  // Commas separate: dish, option, category_option
  const parts = orderPart.split(',').map((s) => s.trim());
  const skip = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);

  const dish           = parts[0];
  const option         = skip(parts[1]);
  const categoryOption = skip(parts[2]);

  // ── Place the order ──
  const result = await placeOrder({
    name: userName,
    dish,
    option,
    category_option: categoryOption,
    observations,
  });

  if (!result.success) {
    switch (result.errorCode) {
      case 'CLOSED':
        return ephemeral(`🔒 ${result.error}`);
      case 'NO_MENU':
        return ephemeral(`📭 ${result.error}`);
      case 'DISH_NOT_FOUND':
        return ephemeral(
          `❌ ${result.error}\n\n` +
          `Platos disponibles:\n${result.errorData?.availableDishes}\n\n` +
          `_Usá \`/menu\` para ver el menú completo._`
        );
      case 'OPTION_REQUIRED': {
        const opts = (result.errorData?.options as string[]).join(', ');
        return ephemeral(
          `⚠️ ${result.error}\n` +
          `Opciones: ${opts}\n\n` +
          `_Ej:_ \`/pedir ${dish}, <opción>\``
        );
      }
      case 'INVALID_OPTION': {
        const opts = (result.errorData?.options as string[]).join(', ');
        return ephemeral(`❌ ${result.error}\nOpciones válidas: ${opts}`);
      }
      case 'CATEGORY_OPTION_REQUIRED': {
        const opts = (result.errorData?.options as string[]).join(', ');
        return ephemeral(
          `⚠️ ${result.error}\n` +
          `Opciones: ${opts}\n\n` +
          `_Ej:_ \`/pedir ${dish}, ${option ?? '<opción>'}, <guarnición>\``
        );
      }
      case 'INVALID_CATEGORY_OPTION': {
        const opts = (result.errorData?.options as string[]).join(', ');
        return ephemeral(`❌ ${result.error}\nOpciones válidas: ${opts}`);
      }
      case 'DUPLICATE_NAME': {
        const existing = result.errorData?.existingOrder as { dish: string; time: string };
        return ephemeral(
          `⚠️ Ya tenés un pedido registrado: *${existing.dish}* (${existing.time}).\n` +
          `Contactá al admin si necesitás cambiarlo.`
        );
      }
      default:
        return ephemeral(`❌ ${result.error ?? 'Error desconocido.'}`);
    }
  }

  // ── Success ──
  const order = result.order!;
  let msg = `✅ *Pedido registrado*\n`;
  msg += `🍽️ ${order.dish}`;
  if (order.observations) msg += `  •  📝 _${order.observations}_`;
  msg += `  •  🕐 ${order.time}`;

  return ephemeral(msg);
}
