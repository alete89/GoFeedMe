import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { getMenu, getOrders, getOrdersStatus, saveOrder } from '@/lib/db';
import type { Category, Dish } from '@/lib/types';

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
      'Realizar un pedido de comida. Primero usá get_menu para ver las opciones disponibles y get_orders_status para verificar que los pedidos estén abiertos. El nombre del plato debe coincidir EXACTAMENTE con lo que aparece en el menú.',
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
            'Observaciones adicionales (ej: "sin sal", "doble porción"). Opcional.'
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
        const targetDate =
          date || new Date().toISOString().split('T')[0];

        // Verificar que los pedidos estén abiertos
        const status = await getOrdersStatus(targetDate);
        if (status !== 'open') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `🔒 Los pedidos para ${targetDate} están cerrados. No se pueden hacer más pedidos.`,
              },
            ],
          };
        }

        // Obtener el menú y validar el plato
        const menuData = await getMenu(targetDate);
        if (!menuData) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No hay menú cargado para ${targetDate}. No se puede hacer el pedido.`,
              },
            ],
          };
        }

        const categories = (menuData as { categories: Category[] }).categories;

        // Buscar el plato en el menú (case-insensitive)
        let foundDish: Dish | undefined;
        let foundCategory: Category | undefined;

        for (const cat of categories) {
          const match = cat.dishes.find(
            (d) => d.name.toLowerCase().trim() === dish.toLowerCase().trim()
          );
          if (match) {
            foundDish = match;
            foundCategory = cat;
            break;
          }
        }

        if (!foundDish || !foundCategory) {
          // Listar platos disponibles para ayudar al agente
          const available = categories
            .flatMap((cat) =>
              cat.dishes.map((d) => `  • ${d.name} [${cat.name}]`)
            )
            .join('\n');
          return {
            content: [
              {
                type: 'text' as const,
                text: `❌ El plato "${dish}" no existe en el menú de hoy.\n\nPlatos disponibles:\n${available}`,
              },
            ],
          };
        }

        // Validar opciones del plato (ej: Milanesa → Ternera/Pollo/Berenjena)
        if (foundDish.options && foundDish.options.length > 0) {
          if (!option) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `⚠️ El plato "${foundDish.name}" requiere que elijas una opción:\n${foundDish.options.map((o) => `  • ${o}`).join('\n')}\n\nVolvé a llamar a place_order incluyendo el parámetro "option".`,
                },
              ],
            };
          }

          const validOption = foundDish.options.find(
            (o) => o.toLowerCase().trim() === option.toLowerCase().trim()
          );
          if (!validOption) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `❌ "${option}" no es una opción válida para "${foundDish.name}".\n\nOpciones disponibles:\n${foundDish.options.map((o) => `  • ${o}`).join('\n')}`,
                },
              ],
            };
          }
        }

        // Validar opciones de categoría (ej: guarnición, salsa)
        if (foundDish.usesCategoryOptions && foundCategory.categoryOptions) {
          if (!category_option) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `⚠️ El plato "${foundDish.name}" requiere que elijas ${foundCategory.categoryOptions.label.toLowerCase()}:\n${foundCategory.categoryOptions.options.map((o) => `  • ${o}`).join('\n')}\n\nVolvé a llamar a place_order incluyendo el parámetro "category_option".`,
                },
              ],
            };
          }

          const validCatOption = foundCategory.categoryOptions.options.find(
            (o) => o.toLowerCase().trim() === category_option.toLowerCase().trim()
          );
          if (!validCatOption) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `❌ "${category_option}" no es una opción válida para ${foundCategory.categoryOptions.label.toLowerCase()}.\n\nOpciones disponibles:\n${foundCategory.categoryOptions.options.map((o) => `  • ${o}`).join('\n')}`,
                },
              ],
            };
          }
        }

        // Verificar duplicados
        if (!force) {
          const existingOrders = await getOrders(targetDate);
          const duplicate = existingOrders.find(
            (order: Record<string, string>) =>
              order.name.toLowerCase().trim() ===
              name.toLowerCase().trim()
          );

          if (duplicate) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `⚠️ Ya existe un pedido de "${duplicate.name}" para hoy: "${duplicate.dish}" (${duplicate.time}). Si querés reemplazarlo, volvé a llamar a place_order con force=true.`,
                },
              ],
            };
          }
        }

        // Construir el nombre completo del plato (mismo formato que el frontend)
        let fullDishName = foundDish.name;
        if (option) {
          fullDishName += ` (${option})`;
        }
        if (foundDish.usesCategoryOptions && category_option) {
          fullDishName += option ? `, ${category_option}` : ` (${category_option})`;
        }

        const currentTime = new Date().toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        await saveOrder({
          date: targetDate,
          time: currentTime,
          name,
          dish: fullDishName,
          category: foundCategory.name,
          observations,
        });

        let confirmation = `✅ Pedido registrado!\n\n`;
        confirmation += `👤 ${name}\n`;
        confirmation += `🍽️ ${fullDishName}\n`;
        confirmation += `📂 ${foundCategory.name}\n`;
        if (observations) confirmation += `📝 ${observations}\n`;
        confirmation += `🕐 ${currentTime}`;

        return {
          content: [{ type: 'text' as const, text: confirmation }],
        };
      }
    );
}

async function createHandler(request: Request): Promise<Response> {
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

// Stateless mode: no server-initiated SSE streams, reject GET/DELETE
export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function DELETE(): Promise<Response> {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
