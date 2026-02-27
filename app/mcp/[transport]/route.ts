import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { getMenu, getOrders, getOrdersStatus } from '@/lib/db';
import { placeOrder } from '@/lib/orderService';
import { cleanCategoryName } from '@/lib/utils';
import type { Category } from '@/lib/types';

function registerTools(server: McpServer) {
    // ── Tool 1: Ver el menú del día ──────────────────────────────────
    server.tool(
      'get_menu',
      'Obtener el menú del día. Devuelve las categorías y platos disponibles para pedir.',
      {
        date: z
          .string()
          .optional()
          .describe(
            'Fecha en formato YYYY-MM-DD. Si no se proporciona, se usa la fecha de hoy.'
          ),
      },
      async ({ date }) => {
        const targetDate =
          date || new Date().toISOString().split('T')[0];
        const menu = await getMenu(targetDate);

        if (!menu) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No hay menú cargado para ${targetDate}. Contactá al administrador.`,
              },
            ],
          };
        }

        // Formatear el menú de forma legible
        const categories = (menu as { categories: Category[] }).categories;
        let formatted = `🍽️ Menú del ${targetDate}\n\n`;

        for (const category of categories) {
          formatted += `── ${category.name} ──\n`;
          if (category.notes) {
            formatted += `   📝 ${category.notes}\n`;
          }
          if (category.categoryOptions) {
            formatted += `   Opciones de categoría (${category.categoryOptions.label}): ${category.categoryOptions.options.join(', ')}\n`;
          }
          for (const dish of category.dishes) {
            formatted += `  • ${dish.name}`;
            if (dish.description) {
              formatted += ` — ${dish.description}`;
            }
            if (dish.options && dish.options.length > 0) {
              formatted += ` (opciones: ${dish.options.join(', ')})`;
            }
            formatted += '\n';
          }
          formatted += '\n';
        }

        return {
          content: [{ type: 'text' as const, text: formatted }],
        };
      }
    );

    // ── Tool 2: Ver estado de pedidos ────────────────────────────────
    server.tool(
      'get_orders_status',
      'Verificar si los pedidos están abiertos o cerrados para un día determinado.',
      {
        date: z
          .string()
          .optional()
          .describe('Fecha en formato YYYY-MM-DD. Por defecto, hoy.'),
      },
      async ({ date }) => {
        const targetDate =
          date || new Date().toISOString().split('T')[0];
        const status = await getOrdersStatus(targetDate);

        return {
          content: [
            {
              type: 'text' as const,
              text:
                status === 'open'
                  ? `✅ Los pedidos para ${targetDate} están ABIERTOS. Podés hacer tu pedido.`
                  : `🔒 Los pedidos para ${targetDate} están CERRADOS. Ya no se aceptan más pedidos.`,
            },
          ],
        };
      }
    );

    // ── Tool 3: Ver pedidos del día ──────────────────────────────────
    server.tool(
      'get_orders',
      'Ver todos los pedidos realizados para un día. Útil para que el usuario vea qué pidieron los demás o confirmar su pedido.',
      {
        date: z
          .string()
          .optional()
          .describe('Fecha en formato YYYY-MM-DD. Por defecto, hoy.'),
      },
      async ({ date }) => {
        const targetDate =
          date || new Date().toISOString().split('T')[0];
        const orders = await getOrders(targetDate);

        if (orders.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No hay pedidos todavía para ${targetDate}.`,
              },
            ],
          };
        }

        let formatted = `📋 Pedidos del ${targetDate} (${orders.length} total)\n\n`;

        for (const order of orders) {
          formatted += `• ${order.name}: ${order.dish}`;
          if (order.category) formatted += ` [${order.category}]`;
          if (order.observations) formatted += ` — "${order.observations}"`;
          formatted += ` (${order.time})\n`;
        }

        return {
          content: [{ type: 'text' as const, text: formatted }],
        };
      }
    );

    // ── Tool 4: Hacer un pedido ──────────────────────────────────────
    server.tool(
      'place_order',
      `Realizar un pedido de comida. Primero usá get_menu para ver las opciones disponibles y get_orders_status para verificar que los pedidos estén abiertos. El nombre del plato debe coincidir EXACTAMENTE con lo que aparece en el menú.

IMPORTANTE: SIEMPRE preguntale al usuario si tiene alguna observación o personalización para su pedido (ej: "sin cebolla", "doble porción", "sin sal", etc.) ANTES de llamar a esta herramienta. Las observaciones son opcionales pero el usuario debe tener la oportunidad de agregarlas.`,
      {
        name: z
          .string()
          .describe('Nombre de la persona que hace el pedido.'),
        dish: z
          .string()
          .describe(
            'Nombre EXACTO del plato tal como aparece en el menú (ej: "MILANESA", "RAVIOLES", "POLLO GRILLADO").'
          ),
        option: z
          .string()
          .optional()
          .describe(
            'Si el plato tiene variantes/opciones listadas (ej: Milanesa tiene "Ternera", "Pollo", "Berenjena"), indicar cuál se elige. OBLIGATORIO si el plato tiene opciones.'
          ),
        category_option: z
          .string()
          .optional()
          .describe(
            'Si el plato requiere elegir una opción de su categoría — como la guarnición (Ensalada mixta, Papas fritas, Puré de papa) o la salsa (Filetto, Bolognesa, Pesto, etc.) — indicar cuál se elige. OBLIGATORIO si el plato lo requiere (los marcados con *).'
          ),
        observations: z
          .string()
          .optional()
          .describe(
            'Observaciones o personalizaciones del pedido (ej: "sin cebolla", "doble porción", "sin sal", "extra queso"). Preguntale SIEMPRE al usuario antes de hacer el pedido.'
          ),
        date: z
          .string()
          .optional()
          .describe('Fecha del pedido en formato YYYY-MM-DD. Por defecto, hoy.'),
        force: z
          .boolean()
          .optional()
          .describe(
            'Si es true, permite hacer el pedido aunque ya exista uno con el mismo nombre. Por defecto, false.'
          ),
      },
      async ({ name, dish, option, category_option, observations, date, force }) => {
        const result = await placeOrder({
          name,
          dish,
          option,
          category_option,
          observations,
          date,
          force,
        });

        if (!result.success) {
          let errorText = '';
          switch (result.errorCode) {
            case 'CLOSED':
              errorText = `🔒 ${result.error}`;
              break;
            case 'NO_MENU':
              errorText = result.error!;
              break;
            case 'DISH_NOT_FOUND':
              errorText = `❌ ${result.error}\n\nPlatos disponibles:\n${result.errorData?.availableDishes}`;
              break;
            case 'OPTION_REQUIRED':
              errorText = `⚠️ ${result.error}\n${(result.errorData?.options as string[]).map((o) => `  • ${o}`).join('\n')}\n\nVolvé a llamar a place_order incluyendo el parámetro "option".`;
              break;
            case 'INVALID_OPTION':
              errorText = `❌ ${result.error}\n\nOpciones disponibles:\n${(result.errorData?.options as string[]).map((o) => `  • ${o}`).join('\n')}`;
              break;
            case 'CATEGORY_OPTION_REQUIRED':
              errorText = `⚠️ ${result.error}\n${(result.errorData?.options as string[]).map((o) => `  • ${o}`).join('\n')}\n\nVolvé a llamar a place_order incluyendo el parámetro "category_option".`;
              break;
            case 'INVALID_CATEGORY_OPTION':
              errorText = `❌ ${result.error}\n\nOpciones disponibles:\n${(result.errorData?.options as string[]).map((o) => `  • ${o}`).join('\n')}`;
              break;
            case 'DUPLICATE_NAME': {
              const existing = result.errorData?.existingOrder as { name: string; dish: string; time: string };
              errorText = `⚠️ Ya existe un pedido de "${existing.name}" para hoy: "${existing.dish}" (${existing.time}). Si querés reemplazarlo, volvé a llamar a place_order con force=true.`;
              break;
            }
            default:
              errorText = result.error || 'Error desconocido.';
          }
          return {
            content: [{ type: 'text' as const, text: errorText }],
          };
        }

        const order = result.order!;
        let confirmation = `✅ Pedido registrado!\n\n`;
        confirmation += `👤 ${order.name}\n`;
        confirmation += `🍽️ ${order.dish}\n`;
        confirmation += `📂 ${order.category}\n`;
        if (order.observations) confirmation += `📝 ${order.observations}\n`;
        confirmation += `🕐 ${order.time}`;

        return {
          content: [{ type: 'text' as const, text: confirmation }],
        };
      }
    );
}

async function createHandler(request: Request): Promise<Response> {
  // Log request details for debugging
  console.log('[MCP]', request.method, new URL(request.url).pathname,
    'accept:', request.headers.get('accept'),
    'content-type:', request.headers.get('content-type'));

  // Crear server + transport frescos por cada request
  // (el SDK en modo stateless prohíbe reutilizar el mismo transport)
  const server = new McpServer({ name: 'GoFeedMe', version: '1.0.0' });
  registerTools(server);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: cada request es independiente
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return createHandler(request);
}

// Stateless mode: open an SSE channel that closes immediately (no server-initiated messages)
export async function GET(): Promise<Response> {
  const stream = new ReadableStream({
    start(controller) {
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

export async function DELETE(): Promise<Response> {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
