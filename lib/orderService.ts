import 'server-only';
import { getMenu, getOrders, getOrdersStatus, saveOrder } from './db';
import { cleanCategoryName } from './utils';
import type { Category, Dish } from './types';

export interface PlaceOrderInput {
  name: string;
  dish: string;
  option?: string;
  category_option?: string;
  observations?: string;
  date?: string;
  force?: boolean;
}

export interface PlaceOrderResult {
  success: boolean;
  /** Set when success=false */
  error?: string;
  /** 
   * Error code for programmatic handling.
   * - CLOSED: orders are closed for this date
   * - NO_MENU: no menu loaded for this date
   * - DISH_NOT_FOUND: dish doesn't exist in the menu
   * - OPTION_REQUIRED: dish requires an option selection
   * - INVALID_OPTION: selected option doesn't match available options
   * - CATEGORY_OPTION_REQUIRED: dish requires a category option (garnish, sauce, etc.)
   * - INVALID_CATEGORY_OPTION: selected category option doesn't match available options
   * - DUPLICATE_NAME: an order with this name already exists
   * - MISSING_FIELDS: name or dish not provided
   */
  errorCode?: string;
  /** Additional data depending on the error */
  errorData?: Record<string, unknown>;
  /** Set when success=true */
  order?: {
    name: string;
    dish: string;
    category: string;
    observations?: string;
    time: string;
  };
}

/**
 * Centralized order placement with full validation.
 * Used by:
 * - POST /api/orders (web frontend)
 * - MCP place_order tool (AI agents)
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const { name, dish, option, category_option, observations, force } = input;
  const targetDate = input.date || new Date().toISOString().split('T')[0];

  // ── Basic field validation ──
  if (!name?.trim() || !dish?.trim()) {
    return {
      success: false,
      error: 'El nombre y el plato son obligatorios.',
      errorCode: 'MISSING_FIELDS',
    };
  }

  // ── Check orders are open ──
  const status = await getOrdersStatus(targetDate);
  if (status !== 'open') {
    return {
      success: false,
      error: `Los pedidos para ${targetDate} están cerrados. No se pueden hacer más pedidos.`,
      errorCode: 'CLOSED',
    };
  }

  // ── Load menu and find dish ──
  const menuData = await getMenu(targetDate);
  if (!menuData) {
    return {
      success: false,
      error: `No hay menú cargado para ${targetDate}. No se puede hacer el pedido.`,
      errorCode: 'NO_MENU',
    };
  }

  const categories = (menuData as { categories: Category[] }).categories;

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
    const available = categories
      .flatMap((cat) =>
        cat.dishes.map((d) => `  • ${d.name} [${cleanCategoryName(cat.name)}]`)
      )
      .join('\n');
    return {
      success: false,
      error: `El plato "${dish}" no existe en el menú de hoy.`,
      errorCode: 'DISH_NOT_FOUND',
      errorData: { availableDishes: available },
    };
  }

  // ── Validate dish options (e.g. Milanesa → Ternera/Pollo/Berenjena) ──
  if (foundDish.options && foundDish.options.length > 0) {
    if (!option) {
      return {
        success: false,
        error: `El plato "${foundDish.name}" requiere que elijas una opción.`,
        errorCode: 'OPTION_REQUIRED',
        errorData: { options: foundDish.options },
      };
    }

    const validOption = foundDish.options.find(
      (o) => o.toLowerCase().trim() === option.toLowerCase().trim()
    );
    if (!validOption) {
      return {
        success: false,
        error: `"${option}" no es una opción válida para "${foundDish.name}".`,
        errorCode: 'INVALID_OPTION',
        errorData: { options: foundDish.options },
      };
    }
  }

  // ── Validate category options (e.g. garnish, sauce) ──
  if (foundDish.usesCategoryOptions && foundCategory.categoryOptions) {
    if (!category_option) {
      return {
        success: false,
        error: `El plato "${foundDish.name}" requiere que elijas ${foundCategory.categoryOptions.label.toLowerCase()}.`,
        errorCode: 'CATEGORY_OPTION_REQUIRED',
        errorData: {
          label: foundCategory.categoryOptions.label,
          options: foundCategory.categoryOptions.options,
        },
      };
    }

    const validCatOption = foundCategory.categoryOptions.options.find(
      (o) => o.toLowerCase().trim() === category_option.toLowerCase().trim()
    );
    if (!validCatOption) {
      return {
        success: false,
        error: `"${category_option}" no es válido para ${foundCategory.categoryOptions.label.toLowerCase()}.`,
        errorCode: 'INVALID_CATEGORY_OPTION',
        errorData: {
          label: foundCategory.categoryOptions.label,
          options: foundCategory.categoryOptions.options,
        },
      };
    }
  }

  // ── Check for duplicate name ──
  if (!force) {
    const existingOrders = await getOrders(targetDate);
    const duplicate = existingOrders.find(
      (order: Record<string, string>) =>
        order.name.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (duplicate) {
      return {
        success: false,
        error: `Ya existe un pedido de "${duplicate.name}" para hoy: "${duplicate.dish}" (${duplicate.time}).`,
        errorCode: 'DUPLICATE_NAME',
        errorData: {
          existingOrder: {
            name: duplicate.name,
            dish: duplicate.dish,
            time: duplicate.time,
          },
        },
      };
    }
  }

  // ── Build full dish name (same format as frontend) ──
  let fullDishName = foundDish.name;
  if (option) {
    fullDishName += ` (${option})`;
  }
  if (foundDish.usesCategoryOptions && category_option) {
    fullDishName += option ? `, ${category_option}` : ` (${category_option})`;
  }

  // ── Clean category name (strip emoji codes like :stew:) ──
  const cleanedCategory = cleanCategoryName(foundCategory.name);

  const currentTime = new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  await saveOrder({
    date: targetDate,
    time: currentTime,
    name: name.trim(),
    dish: fullDishName,
    category: cleanedCategory,
    observations: observations?.trim() || undefined,
  });

  return {
    success: true,
    order: {
      name: name.trim(),
      dish: fullDishName,
      category: cleanedCategory,
      observations: observations?.trim(),
      time: currentTime,
    },
  };
}
