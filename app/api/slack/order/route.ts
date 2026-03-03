import { verifySlackRequest, parseSlashCommand, ephemeral } from '@/lib/slack';
import { placeOrder } from '@/lib/orderService';

/**
 * Slack slash command: /order
 *
 * Places a food order on behalf of the Slack user.
 *
 * Syntax:
 *   /order <plato>
 *   /order <plato>, <opción>
 *   /order <plato>, <opción>, <guarnición o salsa>
 *   /order <plato>, <opción>, <guarnición o salsa>; <observaciones>
 *
 * The semicolon separates the order from free-text observations.
 * Commas separate dish → option → category option.
 *
 * Examples:
 *   /order ravioles
 *   /order milanesa, pollo
 *   /order milanesa, pollo, ensalada mixta
 *   /order milanesa, pollo, ensalada mixta; sin cebolla
 *   /order pollo grillado; sin sal y bien cocido
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
      '*Uso:* `/order <plato>`\n\n' +
      'Con opciones:\n' +
      '  `/order <plato>, <opción>`\n' +
      '  `/order <plato>, <opción>, <guarnición>`\n' +
      '  `/order <plato>, <opción>, <guarnición>; <observaciones>`\n\n' +
      'Ejemplos:\n' +
      '  `/order ravioles`\n' +
      '  `/order milanesa, pollo`\n' +
      '  `/order milanesa, pollo, ensalada mixta; sin cebolla`\n\n' +
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
          `_Ej:_ \`/order ${dish}, <opción>\``
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
          `_Ej:_ \`/order ${dish}, ${option ?? '...'}, <opción>\``
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
