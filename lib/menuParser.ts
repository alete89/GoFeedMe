export interface Dish {
  id: string;
  name: string;
  description: string;
}

export interface SimpleMenu {
  categories: {
    name: string;
    notes?: string;
    dishes: Dish[];
  }[];
}

export function parseMenu(menuText: string): SimpleMenu {
  const lines = menuText.split('\n').filter(line => line.trim());
  
  const categories: { name: string; notes?: string; dishes: Dish[] }[] = [];
  let currentCategory: { name: string; notes?: string; dishes: Dish[] } | null = null;
  let currentDish: Dish | null = null;
  let dishCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (isCategory(line)) {
      // Nueva categoría
      if (currentCategory) {
        if (currentDish) {
          currentCategory.dishes.push(currentDish);
          currentDish = null;
        }
        categories.push(currentCategory);
      }
      currentCategory = {
        name: line,
        dishes: []
      };
    }
    else if (isDishName(line) && currentCategory) {
      // Nuevo plato
      if (currentDish) {
        currentCategory.dishes.push(currentDish);
      }
      // Generar ID único usando categoría, nombre y contador
      const categorySlug = currentCategory.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const dishSlug = line.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      dishCounter++;
      const dishId = `${categorySlug}-${dishSlug}-${dishCounter}`;
      currentDish = {
        id: dishId,
        name: line,
        description: ''
      };
    }
    else if (isNote(line) && currentCategory && !currentDish) {
      // Nota de categoría (líneas que empiezan con * o son informativas, antes de cualquier plato)
      if (currentCategory.notes) {
        currentCategory.notes += ' ';
      } else {
        currentCategory.notes = '';
      }
      currentCategory.notes += line;
    }
    else if (currentDish && line.length > 0) {
      // Descripción del plato actual
      if (currentDish.description) {
        currentDish.description += ' ';
      }
      currentDish.description += line;
    }
  }

  // Agregar el último plato y categoría
  if (currentDish && currentCategory) {
    currentCategory.dishes.push(currentDish);
  }
  if (currentCategory) {
    categories.push(currentCategory);
  }

  return { categories };
}

function isCategory(line: string): boolean {
  return (line.includes(':') && /^[A-Z]/.test(line)) || 
         (/^[A-Z][a-z]+ :/.test(line));
}

function isDishName(line: string): boolean {
  // Remover contenido entre paréntesis para la validación (incluso si no están cerrados)
  const withoutParentheses = line.replace(/\([^)]*\)?/g, '').trim();
  const withoutSpecialChars = withoutParentheses.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, '');
  
  return withoutSpecialChars.length > 2 && 
         withoutSpecialChars === withoutSpecialChars.toUpperCase() &&
         !line.startsWith('*') && 
         !line.startsWith('-') &&
         !line.toLowerCase().includes('*salsas');
}

function isNote(line: string): boolean {
  return line.startsWith('*') || 
         line.startsWith('-') ||
         line.toLowerCase().startsWith('*salsas');
}
